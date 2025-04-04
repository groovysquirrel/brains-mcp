import { GatewayRequest } from '../types/Request';
import { GatewayResponse } from '../types/Response';
import { ModelConfig } from '../types/Model';
import { Logger } from '../utils/logging/Logger';

export abstract class AbstractModalityHandler {
  protected logger: Logger;

  constructor() {
    this.logger = new Logger(this.constructor.name);
  }

  abstract supportsModality(modality: string): boolean;
  abstract process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse>;
  abstract streamProcess(request: GatewayRequest, model: ModelConfig): AsyncGenerator<GatewayResponse>;

  protected validateRequest(request: GatewayRequest, model: ModelConfig): void {
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