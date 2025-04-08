import { ConfigRepository } from './ConfigRepository';
import { ProviderConfig } from '../../types/Provider';
import { VendorConfig } from '../../types/Vendor';
import { ModelConfig } from '../../types/Model';
import { ModalityConfig } from '../../types/Modality';
import { GatewayModelState, GatewayModelAliases } from '../../types/GatewayState';
import { MetricsConfig, MetricsDestination } from '../../types/Metrics';
import * as fs from 'fs/promises';
import path from 'path';
import { Logger } from '../../utils/logging/Logger';
import { Resource } from 'sst';
/**
 * ProvidersIndex interface for the providers.json file
 */
interface ProvidersIndex {
  providers: Array<{
    name: string;        // The name of the provider (e.g., 'bedrock')
    configPath: string;  // The path to the provider's config file
    enabled: boolean;    // Whether this provider is currently active
  }>;
}

/**
 * Implementation of ConfigRepository that loads configurations from local filesystem
 */
export class LocalConfigLoader implements ConfigRepository {
  private logger: Logger;
  private configPath: string;

  /**
   * Constructor
   * @param configPath - Base path for configuration files
   */
  constructor(configPath?: string) {
    this.logger = new Logger('LocalConfigLoader');
    this.configPath = configPath || `${process.cwd()}/config`;
  }

  /**
   * Gets a provider's configuration
   * @param providerName - The name of the provider
   */
  async getProviderConfig(providerName: string): Promise<ProviderConfig> {
    // Step 1: Read the providers index file
    const providersIndexPath = path.join(this.configPath, 'providers.json');
    this.logger.info('Looking for providers index at:', { path: providersIndexPath });
    
    const indexContent = await fs.readFile(providersIndexPath, 'utf-8');
    const index = JSON.parse(indexContent) as ProvidersIndex;

    // Step 2: Find our provider in the index
    const providerEntry = index.providers.find(p => p.name === providerName);
    if (!providerEntry) {
      throw new Error(`Provider ${providerName} not found in providers index`);
    }

    // Step 3: Read the provider's specific configuration file
    const providerConfigPath = path.join(this.configPath, 'providers', providerName, 'settings.json');
    this.logger.info('Looking for provider config at:', { path: providerConfigPath });
    
    try {
      const configContent = await fs.readFile(providerConfigPath, 'utf-8');
      return JSON.parse(configContent) as ProviderConfig;
    } catch (error) {
      this.logger.error(`Failed to load provider config for ${providerName}:`, { 
        error,
        configPath: providerConfigPath
      });
      throw new Error(`Provider configuration not found at ${providerConfigPath}`);
    }
  }

  /**
   * Gets a vendor's configuration
   * @param vendorName - The name of the vendor
   */
  async getVendorConfig(vendorName: string): Promise<VendorConfig> {
    const vendorPath = path.join(this.configPath, 'vendors', `${vendorName}.json`);
    const configContent = await fs.readFile(vendorPath, 'utf-8');
    return JSON.parse(configContent) as VendorConfig;
  }

  /**
   * Gets a model's configuration by its ID
   * @param modelId - The unique identifier for the model
   * @param providerName - The name of the provider
   */
  async getModelConfig(modelId: string, providerName: string): Promise<ModelConfig> {
    const modelsPath = path.join(this.configPath, 'providers', providerName, 'models.json');
    const configContent = await fs.readFile(modelsPath, 'utf-8');
    const data = JSON.parse(configContent) as { vendors: Array<{ name: string, models: ModelConfig[] }> };
    
    // Search through all vendors' models
    for (const vendor of data.vendors) {
      const model = vendor.models.find(m => m.modelId === modelId);
      if (model) {
        // Check if model is ready
        const isReady = await this.isModelReady(modelId, providerName);
        if (!isReady) {
          throw new Error(`Model ${modelId} is not ready for use. Please check status.json for available models.`);
        }
        return model;
      }
    }
    
    // If model not found, try looking it up as an alias
    try {
      return await this.getModelConfigByAlias(modelId, providerName);
    } catch (error) {
      throw new Error(`Model ${modelId} not found in provider ${providerName}`);
    }
  }

  /**
   * Gets a model's configuration by its alias
   * @param alias - The alias to look up
   * @param providerName - The name of the provider
   */
  async getModelConfigByAlias(alias: string, providerName: string): Promise<ModelConfig> {
    const aliasConfig = await this.getAliasConfig(providerName);
    const aliasEntry = aliasConfig.aliases.find(a => a.alias === alias);
    
    if (!aliasEntry) {
      throw new Error(`No model found with alias '${alias}' in provider ${providerName}`);
    }

    // Get the actual model config
    return await this.getModelConfig(aliasEntry.modelId, providerName);
  }

  /**
   * Gets a modality's configuration
   * @param modalityName - The name of the modality
   */
  async getModalityConfig(modalityName: string): Promise<ModalityConfig> {
    const modalityPath = path.join(this.configPath, 'modalities', `${modalityName}.json`);
    const configContent = await fs.readFile(modalityPath, 'utf-8');
    return JSON.parse(configContent) as ModalityConfig;
  }

  /**
   * Loads all vendor configurations
   */
  async loadAllVendorConfigs(): Promise<Record<string, VendorConfig>> {
    const vendorsPath = path.join(this.configPath, 'vendors');
    const files = await fs.readdir(vendorsPath);
    const vendorConfigs: Record<string, VendorConfig> = {};
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const configPath = path.join(vendorsPath, file);
        const configContent = await fs.readFile(configPath, 'utf-8');
        const config = JSON.parse(configContent) as VendorConfig;
        vendorConfigs[config.name] = config;
      }
    }
    
    return vendorConfigs;
  }

  /**
   * Loads all modality configurations
   */
  async loadAllModalityConfigs(): Promise<ModalityConfig[]> {
    const modalitiesPath = path.join(this.configPath, 'modalities');
    const files = await fs.readdir(modalitiesPath);
    const configs: ModalityConfig[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        const configPath = path.join(modalitiesPath, file);
        const configContent = await fs.readFile(configPath, 'utf-8');
        configs.push(JSON.parse(configContent) as ModalityConfig);
      }
    }
    
    return configs;
  }

  /**
   * Gets status configuration for a provider
   * @param providerName - The name of the provider
   */
  async getStatusConfig(providerName: string): Promise<GatewayModelState> {
    const statusPath = path.join(this.configPath, 'providers', providerName, 'status.json');
    const configContent = await fs.readFile(statusPath, 'utf-8');
    return JSON.parse(configContent) as GatewayModelState;
  }

  /**
   * Gets alias configuration for a provider
   * @param providerName - The name of the provider
   */
  async getAliasConfig(providerName: string): Promise<GatewayModelAliases> {
    const aliasPath = path.join(this.configPath, 'providers', providerName, 'aliases.json');
    const configContent = await fs.readFile(aliasPath, 'utf-8');
    return JSON.parse(configContent) as GatewayModelAliases;
  }

  /**
   * Checks if a model is ready for use
   * @param modelId - The model ID to check
   * @param providerName - The name of the provider
   */
  async isModelReady(modelId: string, providerName: string): Promise<boolean> {
    const statusConfig = await this.getStatusConfig(providerName);
    
    // Check READY status
    const readyStatus = statusConfig.statuses.find(s => s.status === "READY");
    if (readyStatus) {
      // Check ONDEMAND connection
      const ondemandConnection = readyStatus.connections?.find(c => c.type === "ONDEMAND");
      if (ondemandConnection) {
        // Check all vendors in ONDEMAND
        for (const vendor of ondemandConnection.vendors) {
          if (vendor.models.some(m => m.modelId === modelId)) {
            return true;
          }
        }
      }
    }
    
    return false;
  }

  /**
   * Gets the metrics configuration
   */
  async getMetricsConfig(): Promise<MetricsConfig> {
    try {
      // For testing, we're only getting the region from the metrics.json file
      // The actual resources will be accessed directly from SST Resource object
      const metricsPath = path.join(this.configPath, 'system', 'metrics.json');
      this.logger.info('Looking for metrics config at:', { path: metricsPath });
      
      const configContent = await fs.readFile(metricsPath, 'utf-8');
      const rawConfig = JSON.parse(configContent);
      
      // Extract only basic configuration
      const enabled = rawConfig.environment?.LLM_METRICS_ENABLED === true;
      const destStr = rawConfig.environment?.LLM_METRICS_DESTINATION?.toLowerCase() || 'none';
      const awsRegion = rawConfig.environment?.AWS_REGION || 'us-east-1';
      
      // Parse destination
      let destination: MetricsDestination;
      switch (destStr) {
        case 'sqs':
          destination = MetricsDestination.SQS;
          break;
        case 's3':
          destination = MetricsDestination.S3;
          break;
        case 'both':
          destination = MetricsDestination.BOTH;
          break;
        default:
          destination = MetricsDestination.NONE;
      }
      
      return {
        enabled,
        destination,
        awsRegion
      };
    } catch (error) {
      this.logger.error('Failed to load metrics config:', { error });
      // Return default configuration if file not found or parsing error
      return {
        enabled: false,
        destination: MetricsDestination.NONE,
        awsRegion: 'us-east-1'
      };
    }
  }
} 