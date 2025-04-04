import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import { ModelsConfiguration, getDefaultConfig, ModelConfig } from '../types/ModelConfig';
import { Logger } from '../utils/logging/Logger';

/**
 * Handles loading and updating model configurations from disk
 */
export class ModelConfigLoader {
    private static instance: ModelConfigLoader;
    private config: ModelsConfiguration;
    private logger: Logger;
    private readonly configPath: string;

    private constructor() {
        this.logger = new Logger('ModelConfigLoader');
        this.configPath = join(__dirname, '../../config/models.json');
        this.config = this.loadConfig();
    }

    public static getInstance(): ModelConfigLoader {
        if (!ModelConfigLoader.instance) {
            ModelConfigLoader.instance = new ModelConfigLoader();
        }
        return ModelConfigLoader.instance;
    }

    private loadConfig(): ModelsConfiguration {
        try {
            if (!existsSync(this.configPath)) {
                this.logger.info('Model configuration file not found, using default config');
                return getDefaultConfig();
            }

            const configData = readFileSync(this.configPath, 'utf-8');
            return JSON.parse(configData) as ModelsConfiguration;
        } catch (error) {
            this.logger.error('Failed to load model configuration:', error);
            return getDefaultConfig();
        }
    }

    /**
     * Updates the configuration with new models
     */
    public async updateConfig(models: ModelConfig[]): Promise<void> {
        try {
            // Create config directory if it doesn't exist
            const configDir = join(__dirname, '../../config');
            mkdirSync(configDir, { recursive: true });

            // Update configuration
            this.config = {
                models,
                lastUpdated: new Date().toISOString()
            };

            // Save to file
            writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
            this.logger.info('Model configuration updated successfully');
        } catch (error) {
            this.logger.error('Failed to update model configuration:', error);
            throw error;
        }
    }

    public getConfig(): ModelsConfiguration {
        return this.config;
    }

    public getModelById(modelId: string): ModelConfig | undefined {
        return this.config.models.find(model => model.modelId === modelId);
    }

    public getModelsByModality(modality: string): ModelConfig[] {
        return this.config.models.filter(model => model.modality === modality);
    }

    public getModelsByVendor(vendor: string): ModelConfig[] {
        return this.config.models.filter(model => model.vendor === vendor);
    }
} 