import { AbstractVendor } from './AbstractVendor';
import { GatewayRequest } from '../../types/Request';
import { VendorConfig } from '../../types/Vendor';
import { ProviderConfig } from '../../types/Provider';
import { ModelConfig } from '../../types/Model';
import { GatewayResponse } from '../../types/Response';
import { AbstractProvider } from '../providers/AbstractProvider';
import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

export class MetaVendor extends AbstractVendor {
  constructor(config: VendorConfig, providerConfig: ProviderConfig) {
    super(config, providerConfig);
  }

  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown> {
    if (!request.messages) {
      throw new Error('Messages are required for Llama models');
    }

    const defaultSettings = this.getDefaultSettings();
    
    // Get the user's message content
    const userMessage = request.messages.find(msg => msg.role === 'user');
    if (!userMessage) {
      throw new Error('User message is required');
    }

    // Format the prompt according to Llama 3's instruction format
    let formattedPrompt = '';
    
    // Add system prompt if provided
    if (request.systemPrompt) {
      formattedPrompt += `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n${request.systemPrompt}\n<|eot_id|>\n`;
    } else {
      formattedPrompt += `<|begin_of_text|>`;
    }
    
    // Add user message
    formattedPrompt += `<|start_header_id|>user<|end_header_id|>\n${userMessage.content}\n<|eot_id|>\n`;
    
    // Add assistant header
    formattedPrompt += `<|start_header_id|>assistant<|end_header_id|>\n`;
    
    console.debug('Formatted prompt for Llama:', {
      modelId,
      systemPrompt: request.systemPrompt,
      formattedPrompt
    });
    
    return {
      prompt: formattedPrompt,
      max_gen_len: request.maxTokens || defaultSettings.maxTokens,
      temperature: request.temperature || defaultSettings.temperature,
      top_p: request.topP || defaultSettings.topP
    };
  }

  validateRequest(request: GatewayRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('At least one message is required');
    }

    const validRoles = ['user', 'assistant', 'system'];
    for (const message of request.messages) {
      if (!validRoles.includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }
    }
  }

  processStreamChunk(chunk: unknown, modelId: string): { content: string; metadata?: Record<string, unknown> } | null {
    const chunkObj = chunk as Record<string, unknown>;
    
    // Handle generation chunk
    if (chunkObj.generation) {
      const content = chunkObj.generation as string;
      
      // Skip empty content
      if (!content.trim()) {
        return null;
      }
      
      return {
        content,
        metadata: {
          model: modelId,
          isStreaming: true
        }
      };
    }
    
    // Handle final message with usage stats
    if (chunkObj.usage) {
      return {
        content: '',
        metadata: {
          model: modelId,
          usage: chunkObj.usage,
          isStreaming: false
        }
      };
    }
    
    // Handle error chunk
    if (chunkObj.error) {
      console.error('Received error chunk:', {
        modelId,
        error: chunkObj.error
      });
      
      return null;
    }
    
    return null;
  }

  getDefaultSettings() {
    return this.config.defaultSettings || {
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1
    };
  }

  getApiFormat(modelId: string): string {
    return 'prompt';
  }

  formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> } {
    const responseObj = response as Record<string, unknown>;
    
    return {
      content: responseObj.generation as string,
      metadata: {
        model: responseObj.model,
        usage: responseObj.usage
      }
    };
  }

  async process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse> {
    throw new Error('Method not implemented.');
  }

  async *streamProcess(request: GatewayRequest, model: ModelConfig, provider: AbstractProvider): AsyncGenerator<GatewayResponse> {
    const formattedRequest = this.formatRequest(request, model.modelId);
    
    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(formattedRequest)
      });

      console.debug('Sending streaming request to Bedrock:', {
        modelId: model.modelId,
        request: formattedRequest,
        tokenGrouping: request.tokenGrouping
      });

      const response = await (provider as any).bedrock.send(command);
      
      if (!response.body) {
        throw new Error('No response body received from Bedrock');
      }

      yield* this.handleStreamingResponse(response, model.modelId, provider, request);
    } catch (error) {
      console.error('Error in Llama streaming:', {
        error,
        modelId: model.modelId,
        request: formattedRequest
      });
      throw error;
    }
  }
} 