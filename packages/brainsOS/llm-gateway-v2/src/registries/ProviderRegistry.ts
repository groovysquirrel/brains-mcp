import { ProviderConfig } from '../types/Provider';
import { Logger } from '../utils/logging/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';
import { AbstractProvider } from '../providers/AbstractProvider';
import { BedrockProvider } from '../providers/BedrockProvider';

export class ProviderRegistry {
  private providerConfigs: Map<string, ProviderConfig> = new Map();
  private providerInstances: Map<string, AbstractProvider> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('provider-registry');
  }

  async initialize(configPath: string): Promise<void> {
    try {
      const providerFiles = await fs.readdir(path.join(configPath, 'providers'));
      for (const file of providerFiles) {
        if (file.endsWith('.json')) {
          const config = JSON.parse(
            await fs.readFile(path.join(configPath, 'providers', file), 'utf-8')
          ) as ProviderConfig;
          this.providerConfigs.set(config.name, config);
          this.initializeProvider(config);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize provider registry:', error);
      throw error;
    }
  }

  private initializeProvider(config: ProviderConfig): void {
    let provider: AbstractProvider;

    // The provider type should be part of the JSON config
    switch (config.name.split('-')[0].toLowerCase()) {
      case 'bedrock':
        provider = new BedrockProvider(config);
        break;
      default:
        this.logger.info(`Unknown provider type for ${config.name}, skipping initialization`);
        return;
    }

    this.providerInstances.set(config.name, provider);
    this.logger.info(`Initialized provider instance: ${config.name}`);
  }

  getProvider(name: string): AbstractProvider {
    const provider = this.providerInstances.get(name);
    if (!provider) {
      throw new Error(`Provider instance not found: ${name}`);
    }
    return provider;
  }

  getProviderConfig(name: string): ProviderConfig {
    const config = this.providerConfigs.get(name);
    if (!config) {
      throw new Error(`Provider config not found: ${name}`);
    }
    return config;
  }

  getVendorConfig(providerName: string, vendorName: string) {
    const provider = this.getProviderConfig(providerName);
    return provider.vendorConfigs?.[vendorName];
  }
} 