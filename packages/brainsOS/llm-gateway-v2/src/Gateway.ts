import { ProviderRegistry } from './registries/ProviderRegistry';
import { ModelRegistry } from './registries/ModelRegistry';
import { Logger } from './utils/logging/Logger';
import { GatewayRequest } from './types/Request';
import { GatewayResponse } from './types/Response';
import { TextModalityHandler } from './modalities/TextModalityHandler';
import path from 'path';

export class Gateway {
  private providerRegistry: ProviderRegistry;
  private modelRegistry: ModelRegistry;
  private modalityHandlers: Map<string, TextModalityHandler>;
  private logger: Logger;

  constructor() {
    this.providerRegistry = new ProviderRegistry();
    this.modelRegistry = new ModelRegistry();
    this.modalityHandlers = new Map();
    this.logger = new Logger('gateway');
  }

  async initialize(configPath: string = path.join(__dirname, '../config')): Promise<void> {
    try {
      // Initialize registries
      await this.providerRegistry.initialize(configPath);
      await this.modelRegistry.initialize(configPath);

      // Initialize modality handlers
      this.modalityHandlers.set('text', new TextModalityHandler(this.providerRegistry));

      this.logger.info('Gateway initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize gateway:', error);
      throw error;
    }
  }

  async chat(request: GatewayRequest): Promise<GatewayResponse> {
    const model = this.modelRegistry.getModel(request.modelId);
    const handler = this.modalityHandlers.get(model.modality);

    if (!handler) {
      throw new Error(`Unsupported modality: ${model.modality}`);
    }

    return handler.process(request, model);
  }

  async *streamChat(request: GatewayRequest): AsyncGenerator<GatewayResponse> {
    const model = this.modelRegistry.getModel(request.modelId);
    const handler = this.modalityHandlers.get(model.modality);

    if (!handler) {
      throw new Error(`Unsupported modality: ${model.modality}`);
    }

    yield* handler.streamProcess(request, model);
  }
} 