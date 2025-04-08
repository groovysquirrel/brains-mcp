import { AbstractVendor } from './AbstractVendor';
import { GatewayRequest } from '../../types/Request';
import { VendorConfig } from '../../types/Vendor';
import { ProviderConfig } from '../../types/Provider';
import { ModelConfig } from '../../types/Model';
import { GatewayResponse } from '../../types/Response';
import { AbstractProvider } from '../providers/AbstractProvider';
import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

export class AnthropicVendor extends AbstractVendor {
  constructor(config: VendorConfig, providerConfig: ProviderConfig) {
    super(config, providerConfig);
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
      console.error('Error in Anthropic streaming:', {
        error,
        modelId: model.modelId,
        request: formattedRequest
      });
      throw error;
    }
  }

  processStreamChunk(chunk: unknown, modelId: string): { content: string; metadata?: Record<string, unknown> } | null {
    const chunkObj = chunk as Record<string, unknown>;
    
    if (chunkObj.type === 'content_block_delta') {
      const content = (chunkObj.delta as Record<string, unknown>).text as string;
      return {
        content,
        metadata: {
          model: modelId,
          isStreaming: true
        }
      };
    } else if (chunkObj.type === 'message_stop') {
      return {
        content: '',
        metadata: {
          model: modelId,
          usage: chunkObj.usage,
          isStreaming: false
        }
      };
    }
    
    return null;
  }

  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown> {
    if (!request.messages) {
      throw new Error('Messages are required for Claude models');
    }

    const defaultSettings = this.getDefaultSettings();
    
    // Format messages according to Bedrock's requirements
    const messages = request.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    const requestBody: Record<string, unknown> = {
      messages,
      max_tokens: request.maxTokens || defaultSettings.maxTokens,
      temperature: request.temperature || defaultSettings.temperature,
      top_p: request.topP || defaultSettings.topP,
      anthropic_version: 'bedrock-2023-05-31'
    };

    // Add system prompt if provided
    if (request.systemPrompt) {
      requestBody.system = request.systemPrompt;
    }

    console.debug('AnthropicVendor formatRequest:', {
      modelId,
      requestBody,
      systemPrompt: request.systemPrompt
    });
    
    return requestBody;
  }

  validateRequest(request: GatewayRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages are required for Claude models');
    }
  }

  getDefaultSettings() {
    return this.config.defaultSettings || {
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1
    };
  }

  getApiFormat(modelId: string): string {
    return 'messages';
  }

  formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> } {
    const responseObj = response as Record<string, unknown>;
    const content = responseObj.content as Array<{ text: string }> | undefined;
    
    console.debug('AnthropicVendor formatResponse:', {
      response: responseObj,
      content
    });
    
    return {
      content: content?.[0]?.text || '',
      metadata: {
        model: responseObj.model,
        usage: responseObj.usage
      }
    };
  }
} 