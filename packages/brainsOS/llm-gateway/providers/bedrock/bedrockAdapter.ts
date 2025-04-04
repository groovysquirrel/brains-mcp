import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { BedrockClient, ListFoundationModelsCommand } from "@aws-sdk/client-bedrock";
import { ProviderAdapter, ProviderConfig, ChatRequest, ChatResponse, ModelCapabilities, Message } from "../../types";
import { BedrockServiceError } from "../../../system/services/bedrock/bedrockClient";
import { BedrockModelValidator, ModelValidationError } from './modelValidator';

//https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_bedrock-runtime_code_examples.html

export class BedrockAdapter implements ProviderAdapter {
  private bedrockClient: BedrockClient;
  private runtimeClient: BedrockRuntimeClient;
  private config: ProviderConfig;
  private modelCapabilities: Map<string, ModelCapabilities> = new Map();

  async initialize(config: ProviderConfig): Promise<void> {
    this.config = config;
    const region = config.region || "us-east-1";
    const credentials = config.credentials;

    this.bedrockClient = new BedrockClient({ region, credentials });
    this.runtimeClient = new BedrockRuntimeClient({ region, credentials });

    // Pre-fetch model capabilities
    await this.fetchModelCapabilities();
  }

  private async fetchModelCapabilities(): Promise<void> {
    try {
      const command = new ListFoundationModelsCommand({});
      const response = await this.bedrockClient.send(command);
      
      for (const model of response.modelSummaries || []) {
        const vendor = model.providerName || 'unknown';
        const vendorConfig = this.config.vendorConfigs?.[vendor.toLowerCase()];
        
        this.modelCapabilities.set(model.modelId, {
          maxTokens: vendorConfig?.defaultMaxTokens || 4000,
          supportsStreaming: model.inferenceTypesSupported?.includes('ON_DEMAND') || false,
          supportsFunctionCalling: false, // TODO: Implement when Bedrock supports it
          supportedMessageTypes: ['text'],
          apiVersion: vendorConfig?.apiVersion || 'bedrock-2023-05-31',
          vendor,
          modelId: model.modelId,
          inferenceTypes: model.inferenceTypesSupported || [],
          inputModalities: model.inputModalities || [],
          outputModalities: model.outputModalities || []
        });
      }
    } catch (error) {
      throw new BedrockServiceError('Failed to fetch model capabilities', {
        code: error.name || 'UnknownError',
        message: error.message,
        requestId: error.$metadata?.requestId,
        statusCode: error.$metadata?.httpStatusCode || 500,
        service: 'bedrock',
        operation: 'ListFoundationModels',
        raw: error
      });
    }
  }

  async getModelCapabilities(modelId: string): Promise<ModelCapabilities> {
    return BedrockModelValidator.getModelCapabilities(modelId);
  }

  private prepareMessages(messages: Message[], systemPrompt?: string): Message[] {
    const preparedMessages: Message[] = [];
    
    if (systemPrompt) {
      preparedMessages.push({
        role: 'system',
        content: systemPrompt
      });
    }
    
    preparedMessages.push(...messages);
    return preparedMessages;
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    // Validate model capabilities before making the API call
    BedrockModelValidator.validateModelCapabilities(request.modelConfig.modelId, {
      supportsStreaming: false,
      inputModalities: ['TEXT'],
      outputModalities: ['TEXT']
    });

    const { messages, modelConfig, systemPrompt, metadata } = request;
    const capabilities = await this.getModelCapabilities(modelConfig.modelId);
    const vendor = capabilities.vendor.toLowerCase();
    const vendorConfig = this.config.vendorConfigs?.[vendor];

    const preparedMessages = this.prepareMessages(messages, systemPrompt);
    
    // Convert messages to Bedrock format
    const bedrockMessages = preparedMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));

    const command = new InvokeModelCommand({
      modelId: modelConfig.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: capabilities.apiVersion,
        max_tokens: modelConfig.maxTokens || capabilities.maxTokens,
        temperature: modelConfig.temperature || vendorConfig?.defaultTemperature || 0.7,
        messages: bedrockMessages
      })
    });

    try {
      const response = await this.runtimeClient.send(command);
      const responseBody = JSON.parse(new TextDecoder().decode(response.body));
      
      return {
        content: responseBody.content[0].text,
        usage: {
          promptTokens: responseBody.usage?.input_tokens || 0,
          completionTokens: responseBody.usage?.output_tokens || 0,
          totalTokens: responseBody.usage?.total_tokens || 0
        },
        metadata: {
          ...metadata,
          provider: 'bedrock',
          modelId: modelConfig.modelId,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      if (error instanceof ModelValidationError) {
        throw error;
      }
      throw new BedrockServiceError('Failed to invoke model', {
        code: error.name || 'UnknownError',
        message: error.message,
        requestId: error.$metadata?.requestId,
        statusCode: error.$metadata?.httpStatusCode || 500,
        service: 'bedrock',
        operation: 'InvokeModel',
        modelId: modelConfig.modelId,
        vendor,
        raw: error
      });
    }
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<ChatResponse> {
    // Validate model capabilities before making the API call
    BedrockModelValidator.validateModelCapabilities(request.modelConfig.modelId, {
      supportsStreaming: true,
      inputModalities: ['TEXT'],
      outputModalities: ['TEXT']
    });

    const { messages, modelConfig, systemPrompt, metadata } = request;
    const capabilities = await this.getModelCapabilities(modelConfig.modelId);
    const vendor = capabilities.vendor.toLowerCase();
    const vendorConfig = this.config.vendorConfigs?.[vendor];

    if (!capabilities.supportsStreaming) {
      throw new Error(`Model ${modelConfig.modelId} does not support streaming`);
    }

    const preparedMessages = this.prepareMessages(messages, systemPrompt);
    
    // Convert messages to Bedrock format
    const bedrockMessages = preparedMessages.map(msg => ({
      role: msg.role,
      content: [{ type: 'text', text: msg.content }]
    }));

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: modelConfig.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        anthropic_version: capabilities.apiVersion,
        max_tokens: modelConfig.maxTokens || capabilities.maxTokens,
        temperature: modelConfig.temperature || vendorConfig?.defaultTemperature || 0.7,
        messages: bedrockMessages
      })
    });

    try {
      const response = await this.runtimeClient.send(command);
      let accumulatedContent = '';
      let promptTokens = 0;
      let completionTokens = 0;

      for await (const item of response.body) {
        if (item.chunk?.bytes) {
          const chunk = JSON.parse(new TextDecoder().decode(item.chunk.bytes));
          const chunkType = chunk.type;

          // Log the raw chunk for debugging
          console.log('Raw Bedrock chunk:', JSON.stringify(chunk, null, 2));

          if (chunkType === 'message_start') {
            // Capture initial token usage from message_start
            if (chunk.message?.usage) {
              promptTokens = chunk.message.usage.input_tokens || 0;
              completionTokens = chunk.message.usage.output_tokens || 0;
            }
            console.log('Initial token usage:', { promptTokens, completionTokens });
          } else if (chunkType === 'content_block_delta') {
            // Handle content block delta
            const content = chunk.delta.text;
            accumulatedContent += content;
            
            // Each content block delta is typically one token
            completionTokens++;

            yield {
              content,
              usage: {
                promptTokens,
                completionTokens,
                totalTokens: promptTokens + completionTokens
              },
              metadata: {
                ...metadata,
                provider: 'bedrock',
                modelId: modelConfig.modelId,
                timestamp: new Date().toISOString(),
                isStreaming: true
              }
            };
          } else if (chunkType === 'message_stop') {
            // Log final message stop data
            console.log('Message stop:', JSON.stringify(chunk, null, 2));
          } else if (chunkType === 'error') {
            // Log error data
            console.log('Error chunk:', JSON.stringify(chunk, null, 2));
            throw new BedrockServiceError('Stream error occurred', {
              code: chunk.error.code || 'UnknownError',
              message: chunk.error.message,
              service: 'bedrock',
              operation: 'InvokeModelWithResponseStream',
              modelId: modelConfig.modelId,
              vendor,
              statusCode: chunk.error.statusCode || 500,
              raw: chunk.error
            });
          }
        }
      }
    } catch (error) {
      if (error instanceof ModelValidationError) {
        throw error;
      }
      throw new BedrockServiceError('Failed to stream from model', {
        code: error.name || 'UnknownError',
        message: error.message,
        requestId: error.$metadata?.requestId,
        statusCode: error.$metadata?.httpStatusCode || 500,
        service: 'bedrock',
        operation: 'InvokeModelWithResponseStream',
        modelId: modelConfig.modelId,
        vendor,
        raw: error
      });
    }
  }
} 