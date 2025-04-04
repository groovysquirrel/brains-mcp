import { ModelConfigLoader } from './ModelConfigLoader';
import { BedrockDiscovery } from './discovery/BedrockDiscovery';
import { ModelsConfiguration, ModelConfig } from '../types/ModelConfig';
import { Logger } from '../utils/logging/Logger';

/**
 * Centralized configuration management for the LLM Gateway
 * Handles model discovery, configuration loading, and model validation
 */
export class ConfigManager {
    private static instance: ConfigManager;
    private configLoader: ModelConfigLoader;
    private discovery: BedrockDiscovery;
    private logger: Logger;

    private constructor() {
        this.logger = new Logger('ConfigManager');
        this.configLoader = ModelConfigLoader.getInstance();
        this.discovery = new BedrockDiscovery();
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    /**
     * Discovers and updates model configurations
     */
    public async discoverAndUpdateModels(): Promise<ModelConfig[]> {
        try {
            this.logger.info('Starting model discovery...');
            const models = await this.discovery.discoverModels();
            await this.configLoader.updateConfig(models);
            this.logger.info('Model discovery completed successfully');
            return models;
        } catch (error) {
            this.logger.error('Failed to discover models:', error);
            throw error;
        }
    }

    /**
     * Gets the current model configuration
     */
    public getConfig(): ModelsConfiguration {
        return this.configLoader.getConfig();
    }

    /**
     * Validates if a model is supported
     */
    public validateModel(modelId: string, modality: string): boolean {
        const model = this.configLoader.getModelById(modelId);
        return model !== undefined && model.modality === modality;
    }

    /**
     * Gets all models supporting a specific modality
     */
    public getModelsByModality(modality: string): ModelConfig[] {
        return this.configLoader.getModelsByModality(modality);
    }

    /**
     * Gets all models from a specific vendor
     */
    public getModelsByVendor(vendor: string): ModelConfig[] {
        return this.configLoader.getModelsByVendor(vendor);
    }
} 