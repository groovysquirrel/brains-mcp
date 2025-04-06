import { Logger } from './utils/logging/Logger';
import { GatewayRequest } from './types/Request';
import { GatewayResponse } from './types/Response';
import { TextModalityHandler } from './modalities/TextModalityHandler';
import { ProviderConfig } from './types/Provider';
import { VendorConfig } from './types/Vendor';
import { ModelConfig } from './types/Model';
import { ModalityConfig, ModalityHandler } from './types/Modality';
import { GatewayModelState, GatewayModelAliases } from './types/GatewayState';
import * as fs from 'fs/promises';
import path from 'path';

/**
 * ARCHITECTURE OVERVIEW
 * 
 * The LLM Gateway follows a hierarchical architecture with clear separation of concerns:
 * 
 * 1. PROVIDERS (e.g., AWS Bedrock)
 *    - The platform or service that hosts the AI models
 *    - Handles authentication, API endpoints, and service-specific features
 *    - Example: AWS Bedrock provides access to various AI models through their API
 * 
 * 2. VENDORS (e.g., Anthropic, OpenAI)
 *    - The companies that create and train the AI models
 *    - Define the model's capabilities, pricing, and terms of use
 *    - Example: Anthropic creates Claude models, OpenAI creates GPT models
 * 
 * 3. MODELS (e.g., Claude 3 Sonnet)
 *    - The specific AI model implementation
 *    - Defines the model's size, capabilities, and performance characteristics
 *    - Example: Claude 3 Sonnet is a specific model from Anthropic
 * 
 * 4. MODALITIES (e.g., text-to-text, image-to-text)
 *    - The type of input/output the model can handle
 *    - Defines how to process different types of requests
 *    - Example: text-to-text handles converting text input to text output
 * 
 * This architecture allows us to:
 * - Mix and match different providers, vendors, and models
 * - Add new capabilities without changing existing code
 * - Maintain clear separation between different components
 * - Scale the system by adding new providers or vendors
 */

interface ProvidersIndex {
  providers: Array<{
    name: string;        // The name of the provider (e.g., 'bedrock')
    configPath: string;  // The path to the provider's config file
    enabled: boolean;    // Whether this provider is currently active
  }>;
}

/**
 * The Gateway class is the main entry point for our LLM (Large Language Model) service.
 * Think of it like a traffic controller that:
 * 1. Receives requests from users
 * 2. Finds the right configuration files
 * 3. Routes the request to the appropriate handler
 * 4. Returns the response
 */
export class Gateway {
  private logger: Logger;
  private configSource: string;  // Store the source for all config loading
  private defaultConfigPath: string;
  private providerConfig!: ProviderConfig;
  private vendorConfigs!: Record<string, VendorConfig>;

  /**
   * Constructor: Called when we create a new Gateway instance
   * Sets up our initial state
   */
  constructor() {
    this.logger = new Logger('LLM Gateway');
    this.configSource = 'local'; // Default to local
    this.defaultConfigPath = `${process.cwd()}/config`;
  }

  /**
   * Gets a provider's configuration from either local files or DynamoDB
   * @param providerName - The name of the provider we want (e.g., 'bedrock')
   * @returns The provider's configuration
   */
  private async getProviderConfig(providerName: string): Promise<ProviderConfig> {
    if (this.configSource === 'local') {
      // Step 1: Read the providers index file
      const providersIndexPath = path.join(this.defaultConfigPath, 'providers.json');
      this.logger.info('Looking for providers index at:', { path: providersIndexPath });
      
      const indexContent = await fs.readFile(providersIndexPath, 'utf-8');
      const index = JSON.parse(indexContent) as ProvidersIndex;

      // Step 2: Find our provider in the index
      const providerEntry = index.providers.find(p => p.name === providerName);
      if (!providerEntry) {
        throw new Error(`Provider ${providerName} not found in providers index`);
      }

      // Step 3: Read the provider's specific configuration file
      // The path should be: config/providers/{providerName}/settings.json
      const providerConfigPath = path.join(this.defaultConfigPath, 'providers', providerName, 'settings.json');
      this.logger.info('Looking for provider config at:', { path: providerConfigPath });
      
      try {
        const configContent = await fs.readFile(providerConfigPath, 'utf-8');
        return JSON.parse(configContent) as ProviderConfig;
      } catch (error) {
        this.logger.error(`Failed to load provider config for ${providerName}:`, { 
          error,
          configPath: providerConfigPath,
          defaultConfigPath: this.defaultConfigPath
        });
        throw new Error(`Provider configuration not found at ${providerConfigPath}`);
      }
    }
    else if (this.configSource === 'dynamodb') {
      // TODO: Implement DynamoDB loading
      throw new Error('DynamoDB config loading not implemented yet');
    }
    else {
      throw new Error(`Invalid source: ${this.configSource}`);
    }
  }

  /**
   * Gets a vendor's configuration (e.g., Anthropic, OpenAI)
   * @param vendorName - The name of the vendor
   * @returns The vendor's configuration
   */
  private async getVendorConfig(vendorName: string): Promise<VendorConfig> {
    if (this.configSource === 'local') {
      // Read the vendor's configuration file directly
      const vendorPath = path.join(this.defaultConfigPath, 'vendors', `${vendorName}.json`);
      const configContent = await fs.readFile(vendorPath, 'utf-8');
      return JSON.parse(configContent) as VendorConfig;
    }
    else if (this.configSource === 'dynamodb') {
      // TODO: Implement DynamoDB loading
      throw new Error('DynamoDB config loading not implemented yet');
    }
    else {
      throw new Error(`Invalid source: ${this.configSource}`);
    }
  }

  /**
   * Gets a model's configuration by its alias
   * @param alias - The alias to look up
   * @param providerName - The name of the provider
   * @returns The model's configuration
   */
  private async getModelConfigByAlias(alias: string, providerName: string): Promise<ModelConfig> {
    if (this.configSource === 'local') {
      // Load alias config
      const aliasConfig = await this.loadAliasConfig(providerName);
      const aliasEntry = aliasConfig.aliases.find(a => a.alias === alias);
      
      if (!aliasEntry) {
        throw new Error(`No model found with alias '${alias}' in provider ${providerName}`);
      }

      // Get the actual model config
      return await this.getModelConfig(aliasEntry.modelId, providerName);
    }
    throw new Error(`Unsupported config source: ${this.configSource}`);
  }

  /**
   * Gets a model's configuration by its model ID
   * @param modelId - The unique identifier for the model
   * @param providerName - The name of the provider
   * @returns The model's configuration
   */
  private async getModelConfig(modelId: string, providerName: string): Promise<ModelConfig> {
    if (this.configSource === 'local') {
      const modelsPath = path.join(this.defaultConfigPath, 'providers', providerName, 'models.json');
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
    throw new Error(`Unsupported config source: ${this.configSource}`);
  }

  /**
   * Checks if a given string is likely an alias rather than a model ID
   * This is a heuristic check - model IDs typically follow the pattern: vendor.model-name-version
   */
  private isLikelyAlias(id: string): boolean {
    return !id.includes('.');
  }

  /**
   * Gets a modality's configuration (e.g., text-to-text, image-to-text)
   * @param modalityName - The name of the modality
   * @returns The modality's configuration
   */
  private async getModalityConfig(modalityName: string): Promise<ModalityConfig> {
    if (this.configSource === 'local') {
      // Read the modality's configuration file
      const modalityPath = path.join(this.defaultConfigPath, 'modalities', `${modalityName}.json`);
      const configContent = await fs.readFile(modalityPath, 'utf-8');
      return JSON.parse(configContent) as ModalityConfig;
    }
    else if (this.configSource === 'dynamodb') {
      // TODO: Implement DynamoDB loading
      throw new Error('DynamoDB config loading not implemented yet');
    }
    else {
      throw new Error(`Invalid source: ${this.configSource}`);
    }
  }

  /**
   * Initializes the gateway with the specified configuration source
   * @param source - Where to load configurations from ('local' or 'dynamodb')
   */
  async initialize(source: string): Promise<void> {
    try {
      this.configSource = source;
      
      // Load vendor configs
      if (this.configSource === 'local') {
        const vendorsPath = path.join(this.defaultConfigPath, 'vendors');
        const files = await fs.readdir(vendorsPath);
        this.vendorConfigs = {};
        
        for (const file of files) {
          if (file.endsWith('.json')) {
            const configPath = path.join(vendorsPath, file);
            const configContent = await fs.readFile(configPath, 'utf-8');
            const config = JSON.parse(configContent) as VendorConfig;
            this.vendorConfigs[config.name] = config;
          }
        }
      }
      
      this.logger.info('Gateway initialized successfully with source:', { source });
    } catch (error) {
      const err = error as Error;
      this.logger.error('Failed to initialize gateway:', {
        error: err
      });
      throw err;
    }
  }

  private async loadModalityConfigs(): Promise<ModalityConfig[]> {
    if (this.configSource === 'local') {
      const modalitiesPath = path.join(this.defaultConfigPath, 'modalities');
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
    throw new Error(`Unsupported config source: ${this.configSource}`);
  }

  private async createModalityHandler(config: ModalityConfig): Promise<ModalityHandler> {
    // Load provider and vendor configs if needed
    if (!this.providerConfig) {
      this.providerConfig = await this.getProviderConfig('bedrock');
    }
    if (!this.vendorConfigs) {
      this.vendorConfigs = {};
      // Load vendor configs as needed
    }

    switch (config.name) {
      case 'text-to-text':
        return new TextModalityHandler(config, this.providerConfig, this.vendorConfigs);
      // Add other modality handlers here
      default:
        throw new Error(`Unsupported modality: ${config.name}`);
    }
  }

  private async getModalityHandler(model: ModelConfig): Promise<ModalityHandler> {
    // Load modality configurations
    const modalityConfigs = await this.loadModalityConfigs();
    
    // Find a handler that supports the model's modalities
    for (const config of modalityConfigs) {
      const handler = await this.createModalityHandler(config);
      
      // Check if the handler supports the model's modalities
      if (handler.supportsModality(model)) {
        // For text modality, we need to check if the model supports text input and output
        if (config.name === 'text-to-text' && 
            model.capabilities.modalities.input.includes('TEXT') && 
            model.capabilities.modalities.output.includes('TEXT')) {
          return handler;
        }
      }
    }
    
    throw new Error(`No modality handler found for model ${model.modelId}`);
  }

  /**
   * Handles a chat request (non-streaming)
   * @param request - The user's request
   * @returns The AI's response
   */
  async chat(request: GatewayRequest): Promise<GatewayResponse> {
    // Step 1: Validate required fields with specific error messages
    if (!request.modelId) {
      throw new Error('Missing required field: modelId. Please specify which model to use (e.g., "anthropic.claude-3-sonnet-20240229-v1:0" or an alias like "claude-3")');
    }
    if (!request.provider) {
      throw new Error('Missing required field: provider. Please specify which provider to use (e.g., "bedrock")');
    }

    // Convert simple "text" modality to "text-to-text"
    if (request.modality === 'text') {
      request.modality = 'text-to-text';
    }

    // Get model config
    const model = await this.getModelConfig(request.modelId, request.provider);
    
    // Get appropriate modality handler
    const handler = await this.getModalityHandler(model);
    
    // Process the request
    return handler.process(request, model);
  }

  /**
   * Handles a streaming chat request
   * This is like a regular chat, but the response comes in pieces
   * @param request - The user's request
   * @returns A stream of responses
   */
  async *streamChat(request: GatewayRequest): AsyncGenerator<GatewayResponse> {
    // Step 1: Validate required fields with specific error messages
    if (!request.modelId) {
      throw new Error('Missing required field: modelId. Please specify which model to use (e.g., "anthropic.claude-3-sonnet-20240229-v1:0" or an alias like "claude-3")');
    }
    if (!request.provider) {
      throw new Error('Missing required field: provider. Please specify which provider to use (e.g., "bedrock")');
    }

    // Convert simple "text" modality to "text-to-text"
    if (request.modality === 'text') {
      request.modality = 'text-to-text';
    }

    // Get model config
    const model = await this.getModelConfig(request.modelId, request.provider);
    
    // Get appropriate modality handler
    const handler = await this.getModalityHandler(model);
    
    // Process the request
    yield* handler.streamProcess(request, model);
  }

  /**
   * Gets all models that are ready for use (status: "READY")
   * @param providerName - Optional provider name to filter models
   * @param vendorName - Optional vendor name to filter models
   * @returns Array of ready model configurations
   */
  async getReadyModels(providerName?: string, vendorName?: string): Promise<ModelConfig[]> {
    if (this.configSource === 'local') {
      const readyModels: ModelConfig[] = [];
      
      // Load status config
      const statusConfig = await this.loadStatusConfig(providerName || 'bedrock');
      const readyStatus = statusConfig.statuses.find(s => s.status === "READY");
      
      if (readyStatus) {
        // Get ONDEMAND models
        const ondemandConnection = readyStatus.connections?.find(c => c.type === "ONDEMAND");
        if (ondemandConnection) {
          for (const vendor of ondemandConnection.vendors) {
            if (vendorName && vendor.name !== vendorName) continue;
            
            for (const model of vendor.models) {
              const modelConfig = await this.getModelConfig(model.modelId, providerName || 'bedrock');
              readyModels.push(modelConfig);
            }
          }
        }
      }
      
      return readyModels;
    }
    throw new Error(`Unsupported config source: ${this.configSource}`);
  }

  private async loadStatusConfig(providerName: string): Promise<GatewayModelState> {
    if (this.configSource === 'local') {
      const statusPath = path.join(this.defaultConfigPath, 'providers', providerName, 'status.json');
      const configContent = await fs.readFile(statusPath, 'utf-8');
      return JSON.parse(configContent) as GatewayModelState;
    }
    throw new Error(`Unsupported config source: ${this.configSource}`);
  }

  private async loadAliasConfig(providerName: string): Promise<GatewayModelAliases> {
    if (this.configSource === 'local') {
      const aliasPath = path.join(this.defaultConfigPath, 'providers', providerName, 'aliases.json');
      const configContent = await fs.readFile(aliasPath, 'utf-8');
      return JSON.parse(configContent) as GatewayModelAliases;
    }
    throw new Error(`Unsupported config source: ${this.configSource}`);
  }

  private async isModelReady(modelId: string, providerName: string): Promise<boolean> {
    const statusConfig = await this.loadStatusConfig(providerName);
    
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
} 
