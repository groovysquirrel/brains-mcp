import { AbstractModalityHandler } from './AbstractModalityHandler';
import { GatewayRequest } from '../../types/Request';
import { GatewayResponse } from '../../types/Response';
import { ModelConfig } from '../../types/Model';
import { Logger } from '../../utils/logging/Logger';
import { BedrockProvider } from '../providers/BedrockProvider';
import { ProviderConfig } from '../../types/Provider';
import { VendorConfig } from '../../types/Vendor';
import { ModalityConfig, ModalityHandler } from '../../types/Modality';

export class TextModalityHandler extends AbstractModalityHandler implements ModalityHandler {
  private provider: BedrockProvider;
  protected logger: Logger;

  constructor(config: ModalityConfig, providerConfig: ProviderConfig, vendorConfigs: Record<string, VendorConfig>) {
    super(config, providerConfig, vendorConfigs);
    this.logger = new Logger('text-modality-handler');
    this.provider = new BedrockProvider(providerConfig, vendorConfigs);
  }

  async process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse> {
    this.validateRequest(request, model);
    return this.provider.chat(request, model);
  }

  async *streamProcess(request: GatewayRequest, model: ModelConfig): AsyncGenerator<GatewayResponse> {
    this.validateRequest(request, model);
    yield* this.provider.streamChat(request, model);
  }

  protected validateRequest(request: GatewayRequest, model: ModelConfig): void {
    super.validateRequest(request, model);

    // Validate messages if required
    if (this.config.validation.requiresMessages && (!request.messages || request.messages.length === 0)) {
      throw new Error('Messages are required for this modality');
    }

    // Validate system prompt if required
    if (this.config.validation.requiresSystemPrompt && !request.systemPrompt) {
      throw new Error('System prompt is required for this modality');
    }

    // Validate message count
    if (request.messages && request.messages.length > this.config.validation.maxMessagesLength) {
      throw new Error(`Message count exceeds maximum of ${this.config.validation.maxMessagesLength}`);
    }

    // Validate message roles (assuming user and assistant roles are always valid)
    if (request.messages) {
      for (const message of request.messages) {
        if (!['user', 'assistant', 'system'].includes(message.role)) {
          throw new Error(`Invalid message role: ${message.role}`);
        }
      }
    }

    // Validate model supports text modality
    if (!model.capabilities.modalities.input.includes('TEXT') || 
        !model.capabilities.modalities.output.includes('TEXT')) {
      throw new Error(`Model ${model.modelId} does not support text modality`);
    }
  }
} 