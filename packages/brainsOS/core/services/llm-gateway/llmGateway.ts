import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { ChatOpenAI } from "@langchain/openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { 
  SystemMessage, 
  HumanMessage, 
  AIMessage,
  BaseMessage 
} from "@langchain/core/messages";
import { 
  ModelProvider, 
  ModelConfig, 
  ChatRequest, 
  ChatResponse,
  ProviderConfig,
  BedrockModel
} from "./types";

export class LLMGateway {
  private providers: Map<ModelProvider, any> = new Map();
  private providerConfigs: Map<ModelProvider, ProviderConfig> = new Map();
  private model: BedrockChat;

  constructor(providerConfigs: Record<ModelProvider, ProviderConfig>) {
    this.initializeProviders(providerConfigs);
  }

  private initializeProviders(configs: Record<ModelProvider, ProviderConfig>) {
    // Initialize Bedrock
    if (configs.bedrock) {
      this.providers.set('bedrock', new BedrockChat({
        modelName: "anthropic.claude-3-sonnet-20240229-v1:0",
        region: configs.bedrock.region || "us-east-1",
        credentials: configs.bedrock.credentials,
        maxTokens: 4000,
        temperature: 0.7,
      }));
      this.providerConfigs.set('bedrock', configs.bedrock);
      this.model = this.providers.get('bedrock');
    }

    // Initialize OpenAI
    if (configs.openai) {
      this.providers.set('openai', new ChatOpenAI({
        modelName: "gpt-4-turbo-preview",
        openAIApiKey: configs.openai.apiKey,
        maxTokens: 4000,
        temperature: 0.7,
      }));
      this.providerConfigs.set('openai', configs.openai);
    }

    // Initialize Anthropic
    if (configs.anthropic) {
      this.providers.set('anthropic', new ChatAnthropic({
        modelName: "claude-3-sonnet-20240229",
        anthropicApiKey: configs.anthropic.apiKey,
        maxTokens: 4000,
        temperature: 0.7,
      }));
      this.providerConfigs.set('anthropic', configs.anthropic);
    }
  }

  private getModelConfig(modelId: BedrockModel) {
    // Model-specific configurations
    const configs: Record<BedrockModel, { maxTokens: number; temperature: number }> = {
      'anthropic.claude-3-sonnet-20240229-v1:0': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-3-haiku-20240307-v1:0': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-2.1': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-2': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-instant-v1': { maxTokens: 4000, temperature: 0.7 },
      'meta.llama2-13b-chat-v2:0': { maxTokens: 2048, temperature: 0.7 },
      'meta.llama2-70b-chat-v2:0': { maxTokens: 2048, temperature: 0.7 },
      'meta.llama2-7b-chat-v2:0': { maxTokens: 2048, temperature: 0.7 },
      'mistral.mistral-7b-instruct-v0:2': { maxTokens: 2048, temperature: 0.7 },
      'mistral.mixtral-8x7b-instruct-v0:1': { maxTokens: 2048, temperature: 0.7 },
      'mistral.mistral-large-2402-v0:1': { maxTokens: 2048, temperature: 0.7 }
    };

    return configs[modelId];
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, modelConfig, systemPrompt, metadata } = request;
    const provider = modelConfig.provider;
    const model = this.providers.get(provider);

    if (!model) {
      throw new Error(`Provider ${provider} not initialized`);
    }

    try {
      // Update model configuration if different from current
      if (this.model.modelName !== modelConfig.modelId) {
        const config = this.getModelConfig(modelConfig.modelId);
        this.model = new BedrockChat({
          modelName: modelConfig.modelId,
          region: this.model.region,
          credentials: this.model.credentials,
          maxTokens: modelConfig.maxTokens || config.maxTokens,
          temperature: modelConfig.temperature || config.temperature,
        });
      }

      // Prepare messages with system prompt if provided
      const preparedMessages: BaseMessage[] = [];
      if (systemPrompt) {
        preparedMessages.push(new SystemMessage(systemPrompt));
      }
      preparedMessages.push(...messages);

      // Invoke the model
      const response = await this.model.invoke(preparedMessages);

      // Extract usage information
      const usage = {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens: response.usage?.completion_tokens || 0,
        totalTokens: response.usage?.total_tokens || 0,
      };

      return {
        content: response.content,
        usage,
        metadata: {
          ...metadata,
          provider,
          modelId: modelConfig.modelId,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      throw new Error(`Failed to invoke ${modelConfig.modelId}: ${error.message}`);
    }
  }

  async streamChat(request: ChatRequest): AsyncGenerator<ChatResponse> {
    const { messages, modelConfig, systemPrompt, metadata } = request;
    const provider = modelConfig.provider;
    const model = this.providers.get(provider);

    if (!model) {
      throw new Error(`Provider ${provider} not initialized`);
    }

    try {
      // Update model configuration if different from current
      if (this.model.modelName !== modelConfig.modelId) {
        const config = this.getModelConfig(modelConfig.modelId);
        this.model = new BedrockChat({
          modelName: modelConfig.modelId,
          region: this.model.region,
          credentials: this.model.credentials,
          maxTokens: modelConfig.maxTokens || config.maxTokens,
          temperature: modelConfig.temperature || config.temperature,
        });
      }

      // Prepare messages with system prompt if provided
      const preparedMessages: BaseMessage[] = [];
      if (systemPrompt) {
        preparedMessages.push(new SystemMessage(systemPrompt));
      }
      preparedMessages.push(...messages);

      // Stream the response
      const stream = await this.model.stream(preparedMessages);
      
      for await (const chunk of stream) {
        yield {
          content: chunk.content,
          usage: {
            promptTokens: chunk.usage?.prompt_tokens || 0,
            completionTokens: chunk.usage?.completion_tokens || 0,
            totalTokens: chunk.usage?.total_tokens || 0,
          },
          metadata: {
            ...metadata,
            provider,
            modelId: modelConfig.modelId,
            timestamp: new Date().toISOString(),
          }
        };
      }
    } catch (error) {
      throw new Error(`Failed to stream from ${modelConfig.modelId}: ${error.message}`);
    }
  }
} 