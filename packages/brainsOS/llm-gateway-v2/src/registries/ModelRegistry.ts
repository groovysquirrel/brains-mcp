import { ModelConfig } from '../types/Model';
import { Logger } from '../utils/logging/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';

interface ModelConfigWithAliases extends ModelConfig {
  aliases?: string[];
}

export class ModelRegistry {
  private models: Map<string, ModelConfig> = new Map();
  private aliases: Map<string, string> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('model-registry');
  }

  async initialize(configPath: string): Promise<void> {
    try {
      const modelFiles = await fs.readdir(path.join(configPath, 'models'));
      for (const file of modelFiles) {
        if (file.endsWith('.json')) {
          const config = JSON.parse(
            await fs.readFile(path.join(configPath, 'models', file), 'utf-8')
          ) as ModelConfigWithAliases;
          this.loadModels(config);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize model registry:', error);
      throw error;
    }
  }

  private loadModels(config: ModelConfigWithAliases): void {
    this.models.set(config.modelId, config);
    
    if (config.aliases) {
      for (const alias of config.aliases) {
        this.aliases.set(alias, config.modelId);
      }
    }
  }

  getModel(modelId: string): ModelConfig {
    const actualModelId = this.aliases.get(modelId) || modelId;
    const model = this.models.get(actualModelId);
    
    if (!model) {
      throw new Error(`Model not found: ${modelId}`);
    }
    
    return model;
  }

  validateModelCapabilities(
    modelId: string,
    requiredCapabilities: {
      modality: string;
      streaming?: boolean;
      provisioned?: boolean;
    }
  ): void {
    const model = this.getModel(modelId);
    
    if (!model.capabilities.modalities.includes(requiredCapabilities.modality)) {
      throw new Error(
        `Model ${modelId} does not support modality: ${requiredCapabilities.modality}`
      );
    }
    
    if (requiredCapabilities.streaming && !model.capabilities.streaming) {
      throw new Error(`Model ${modelId} does not support streaming`);
    }
    
    if (requiredCapabilities.provisioned && !model.capabilities.provisioned) {
      throw new Error(`Model ${modelId} is not provisioned`);
    }
  }
} 