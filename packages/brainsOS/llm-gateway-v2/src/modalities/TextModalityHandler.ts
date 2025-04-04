import { AbstractModalityHandler } from './AbstractModalityHandler';
import { GatewayRequest } from '../types/Request';
import { GatewayResponse } from '../types/Response';
import { ModelConfig } from '../types/Model';
import { ProviderRegistry } from '../registries/ProviderRegistry';
import { Logger } from '../utils/logging/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ModalityConfig {
  name: string;
  inputValidation: {
    requiredFields: string[];
    messageValidation: {
      requiredFields: string[];
      allowedRoles: string[];
    };
  };
  outputValidation: {
    requiredFields: string[];
    optionalFields: string[];
  };
  supportedProviders: string[];
  defaultMaxTokens: number;
  defaultTemperature: number;
}

export class TextModalityHandler extends AbstractModalityHandler {
  private providerRegistry: ProviderRegistry;
  private config!: ModalityConfig; // Using definite assignment assertion
  protected logger: Logger; // Changed to protected to match parent class

  constructor(providerRegistry: ProviderRegistry) {
    super();
    this.providerRegistry = providerRegistry;
    this.logger = new Logger('text-modality-handler');
    this.loadConfig();
  }

  private async loadConfig(): Promise<void> {
    try {
      const configPath = path.join(__dirname, '../../config/modalities/text.json');
      this.config = JSON.parse(await fs.readFile(configPath, 'utf-8')) as ModalityConfig;
    } catch (error) {
      this.logger.error('Failed to load text modality config:', error);
      throw error;
    }
  }

  supportsModality(modality: string): boolean {
    return modality.toLowerCase() === this.config.name;
  }

  async process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse> {
    this.validateRequest(request, model);
    const provider = this.providerRegistry.getProvider(model.provider);
    return provider.chat(request, model);
  }

  async *streamProcess(request: GatewayRequest, model: ModelConfig): AsyncGenerator<GatewayResponse> {
    this.validateRequest(request, model);
    const provider = this.providerRegistry.getProvider(model.provider);
    yield* provider.streamChat(request, model);
  }

  protected validateRequest(request: GatewayRequest, model: ModelConfig): void {
    super.validateRequest(request, model);

    // Validate required fields
    for (const field of this.config.inputValidation.requiredFields) {
      if (!(field in request)) {
        throw new Error(`Missing required field: ${field}`);
      }
    }

    // Validate messages if present
    if (request.messages) {
      for (const message of request.messages) {
        for (const field of this.config.inputValidation.messageValidation.requiredFields) {
          if (!(field in message)) {
            throw new Error(`Missing required message field: ${field}`);
          }
        }

        if (!this.config.inputValidation.messageValidation.allowedRoles.includes(message.role)) {
          throw new Error(`Invalid message role: ${message.role}`);
        }
      }
    }
  }
} 