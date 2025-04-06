import { VendorConfig } from '../types/Vendor';
import { ModelConfig } from '../types/Model';
import * as fs from 'fs';
import * as path from 'path';

export class ConfigLoader {
  private static readonly CONFIG_BASE_PATH = path.join(__dirname, '../../config');

  static loadVendorConfig(vendorName: string): VendorConfig {
    const configPath = path.join(
      this.CONFIG_BASE_PATH,
      'providers',
      'bedrock',
      'vendors',
      `${vendorName.toLowerCase()}.json`
    );

    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to load vendor config for ${vendorName}: ${error.message}`);
    }
  }

  static loadProviderConfig(providerName: string): any {
    const configPath = path.join(
      this.CONFIG_BASE_PATH,
      'providers',
      `${providerName.toLowerCase()}.json`
    );

    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to load provider config for ${providerName}: ${error.message}`);
    }
  }

  static loadModelConfig(modelId: string): ModelConfig {
    const configPath = path.join(
      this.CONFIG_BASE_PATH,
      'modalities',
      'text-to-text',
      'models',
      `${modelId.toLowerCase()}.json`
    );

    try {
      const configData = fs.readFileSync(configPath, 'utf8');
      return JSON.parse(configData);
    } catch (err) {
      const error = err as Error;
      throw new Error(`Failed to load model config for ${modelId}: ${error.message}`);
    }
  }

  static validateModelCapabilities(
    modelId: string,
    requiredCapabilities: {
      modality: string;
      streaming?: boolean;
      inferenceType?: 'onDemand' | 'provisioned';
    }
  ): void {
    const model = this.loadModelConfig(modelId);
    
    if (model.modality !== requiredCapabilities.modality) {
      throw new Error(
        `Model ${modelId} does not support modality: ${requiredCapabilities.modality}`
      );
    }
    
    if (requiredCapabilities.streaming && !model.capabilities.streaming) {
      throw new Error(`Model ${modelId} does not support streaming`);
    }
    
    if (requiredCapabilities.inferenceType && 
        !model.capabilities.inferenceTypes[requiredCapabilities.inferenceType]) {
      throw new Error(`Model ${modelId} does not support ${requiredCapabilities.inferenceType} inference`);
    }
  }
} 