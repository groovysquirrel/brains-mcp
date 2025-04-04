import { GatewayRequest } from '../types/Request';
import { GatewayResponse } from '../types/Response';
import { ModelConfig } from '../types/Model';
import { ProviderConfig } from '../types/Provider';
import { Logger } from '../utils/logging/Logger';

export abstract class AbstractProvider {
  protected config: ProviderConfig;
  protected logger: Logger;

  constructor(config: ProviderConfig) {
    this.config = config;
    this.logger = new Logger(`provider-${config.name}`);
  }

  abstract supportsVendor(vendor: string): boolean;
  abstract chat(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse>;
  abstract streamChat(request: GatewayRequest, model: ModelConfig): AsyncGenerator<GatewayResponse>;

  protected validateRequest(request: GatewayRequest, model: ModelConfig): void {
    if (!this.supportsVendor(model.vendor)) {
      throw new Error(`Provider ${this.config.name} does not support vendor ${model.vendor}`);
    }

    if (request.streaming && !model.capabilities.streaming) {
      throw new Error(`Model ${model.modelId} does not support streaming`);
    }

    if (request.provisioned && !model.capabilities.provisioned) {
      throw new Error(`Model ${model.modelId} is not provisioned`);
    }
  }
} 