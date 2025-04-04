import { AbstractProvider } from './AbstractProvider';
import { GatewayRequest } from '../types/Request';
import { GatewayResponse } from '../types/Response';
import { ModelConfig } from '../types/Model';
import { ProviderConfig } from '../types/Provider';
import { Logger } from '../utils/logging/Logger';
import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { InvokeModelCommand, InvokeModelWithResponseStreamCommand, InvokeModelCommandOutput, InvokeModelWithResponseStreamCommandOutput } from '@aws-sdk/client-bedrock-runtime';

export class BedrockProvider extends AbstractProvider {
  private bedrock: BedrockRuntimeClient;

  constructor(config: ProviderConfig) {
    super(config);
    this.bedrock = new BedrockRuntimeClient({
      region: config.region || 'us-east-1'
    });
  }

  supportsVendor(vendor: string): boolean {
    return ['anthropic', 'meta', 'mistral'].includes(vendor.toLowerCase());
  }

  async chat(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse> {
    this.validateRequest(request, model);

    try {
      const command = new InvokeModelCommand({
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: this.formatRequest(request, model)
      });

      const response = await this.bedrock.send(command);
      return this.formatResponse(response, model);
    } catch (error) {
      this.logger.error('Failed to invoke Bedrock model:', error);
      throw error;
    }
  }

  async *streamChat(request: GatewayRequest, model: ModelConfig): AsyncGenerator<GatewayResponse> {
    this.validateRequest(request, model);

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: this.formatRequest(request, model)
      });

      const response = await this.bedrock.send(command);
      
      if (!response.body) {
        throw new Error('No response body received from Bedrock');
      }

      for await (const chunk of response.body) {
        if (chunk.chunk?.bytes) {
          const decoded = new TextDecoder().decode(chunk.chunk.bytes);
          const parsed = JSON.parse(decoded);
          yield this.formatResponse(parsed, model);
        }
      }
    } catch (error) {
      this.logger.error('Failed to stream from Bedrock model:', error);
      throw error;
    }
  }

  private formatRequest(request: GatewayRequest, model: ModelConfig): Uint8Array {
    // This is a simplified version. In reality, you'd need to handle
    // different vendor formats (Anthropic, Meta, etc.)
    const formatted = {
      prompt: request.messages?.map(m => `${m.role}: ${m.content}`).join('\n') || request.prompt,
      max_tokens: request.maxTokens || this.config.defaultMaxTokens,
      temperature: request.temperature || this.config.defaultTemperature
    };

    return new TextEncoder().encode(JSON.stringify(formatted));
  }

  private formatResponse(response: InvokeModelCommandOutput | any, model: ModelConfig): GatewayResponse {
    // This is a simplified version. In reality, you'd need to handle
    // different vendor response formats
    return {
      content: response.completion || response.output || '',
      metadata: {
        modelId: model.modelId,
        vendor: model.vendor
      }
    };
  }
} 