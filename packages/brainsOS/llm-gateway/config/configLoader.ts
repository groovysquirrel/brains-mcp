import { Logger } from '../../handlers/shared/logging/logger';
import { LLMGatewayConfig, BedrockConfig } from '../types';
import vendorConfig from './vendorConfig.json';
import bedrockVendorConfig from './bedrock/vendorConfig.json';

const logger = new Logger('ConfigLoader');

export class ConfigLoader {
  private static instance: ConfigLoader;
  private config: LLMGatewayConfig;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ConfigLoader {
    if (!ConfigLoader.instance) {
      ConfigLoader.instance = new ConfigLoader();
    }
    return ConfigLoader.instance;
  }

  private loadConfig(): LLMGatewayConfig {
    try {
      // Load Bedrock configuration
      const bedrockConfig: BedrockConfig = {
        region: process.env.AWS_REGION || 'us-east-1',
        vendorConfigs: bedrockVendorConfig
      };

      // Load other provider configurations
      const openaiConfig = vendorConfig.openai;
      const anthropicConfig = vendorConfig.anthropic;

      return {
        bedrock: bedrockConfig,
        openai: openaiConfig,
        anthropic: anthropicConfig
      };
    } catch (error) {
      logger.error('Failed to load configuration:', {
        error,
        stack: error.stack
      });
      throw error;
    }
  }

  public getLLMGatewayConfig(): LLMGatewayConfig {
    return this.config;
  }
} 