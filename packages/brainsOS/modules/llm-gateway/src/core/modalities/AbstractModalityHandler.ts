import { ModalityConfig, ModalityHandler, ModalityType } from '../../types/Modality';
import { GatewayRequest } from '../../types/Request';
import { GatewayResponse } from '../../types/Response';
import { ModelConfig } from '../../types/Model';
import { ProviderConfig } from '../../types/Provider';
import { VendorConfig } from '../../types/Vendor';
import { Logger } from '../../../../utils/logging/Logger';

export abstract class AbstractModalityHandler implements ModalityHandler {
  protected config: ModalityConfig;
  protected providerConfig: ProviderConfig;
  protected vendorConfigs: Record<string, VendorConfig>;
  protected logger: Logger;

  constructor(config: ModalityConfig, providerConfig: ProviderConfig, vendorConfigs: Record<string, VendorConfig>) {
    this.config = config;
    this.providerConfig = providerConfig;
    this.vendorConfigs = vendorConfigs;
    this.logger = new Logger(this.constructor.name);
  }

  abstract process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse>;
  abstract streamProcess(request: GatewayRequest, model: ModelConfig): AsyncGenerator<GatewayResponse>;

  supportsModality(model: ModelConfig): boolean {
    // Check if the model supports all required input and output types
    const supportedInputTypes = new Set(model.capabilities.modalities.input.map(t => t.toLowerCase()));
    const supportedOutputTypes = new Set(model.capabilities.modalities.output.map(t => t.toLowerCase()));

    return this.config.capabilities.inputTypes.every(type => 
      supportedInputTypes.has(type.toLowerCase())
    ) && this.config.capabilities.outputTypes.every(type => 
      supportedOutputTypes.has(type.toLowerCase())
    );
  }

  protected validateRequest(request: GatewayRequest, model: ModelConfig): void {
    if (!this.supportsModality(model)) {
      throw new Error(`Model ${model.modelId} does not support the required modalities`);
    }

    if (!request.messages && !request.prompt) {
      throw new Error('Either messages or prompt must be provided');
    }

    if (request.messages && !Array.isArray(request.messages)) {
      throw new Error('Messages must be an array');
    }

    if (request.maxTokens && request.maxTokens < 1) {
      throw new Error('maxTokens must be greater than 0');
    }

    if (request.temperature && (request.temperature < 0 || request.temperature > 1)) {
      throw new Error('temperature must be between 0 and 1');
    }
  }
} 