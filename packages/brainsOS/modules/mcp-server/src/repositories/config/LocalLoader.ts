import { ConfigRepository, MCPServerConfig } from './ConfigRepository';
import { Logger, LogLevel } from '../../../../utils/logging/Logger';
import * as fs from 'fs/promises';
import path from 'path';

interface MetricsEnvironment {
  LLM_METRICS_ENABLED?: boolean;
  LLM_METRICS_DESTINATION?: string;
  AWS_REGION?: string;
}

interface MetricsConfig {
  environment: MetricsEnvironment;
}

/**
 * Implementation of ConfigRepository that loads configurations from local filesystem
 */
export class LocalConfigLoader implements ConfigRepository {
  private logger: Logger;
  private configPath: string;

  constructor(configPath?: string) {
    this.logger = new Logger('MCP-Server-ConfigLoader');
    this.configPath = configPath || path.join(process.cwd(), 'mcp-server','config', 'module');
  }

  private async loadConfigFile<T>(filename: string, defaultValue: T): Promise<T> {
    try {
      const filePath = path.join(this.configPath, filename);
      //this.logger.info('Looking for config at:', { path: filePath });
      
      const configContent = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(configContent);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        this.logger.warn(`Config file ${filename} not found, using defaults`);
      } else {
        this.logger.error(`Failed to load config from ${filename}:`, { error });
      }
      return defaultValue;
    }
  }

  async getLoggerConfig(): Promise<{ logLevel: LogLevel }> {
    return this.loadConfigFile('logger.json', { logLevel: 'info' });
  }

  async getMetricsConfig(): Promise<{
    enabled: boolean;
    destination: 'none' | 'sqs' | 's3' | 'both';
    awsRegion: string;
  }> {
    const defaultConfig: MetricsConfig = {
      environment: {
        LLM_METRICS_ENABLED: false,
        LLM_METRICS_DESTINATION: 'none',
        AWS_REGION: 'us-east-1'
      }
    };

    const rawConfig = await this.loadConfigFile<MetricsConfig>('metrics.json', defaultConfig);
    
    // Extract configuration with defaults
    const enabled = rawConfig.environment.LLM_METRICS_ENABLED === true;
    const destStr = (rawConfig.environment.LLM_METRICS_DESTINATION || 'none').toLowerCase();
    const awsRegion = rawConfig.environment.AWS_REGION || 'us-east-1';
    
    // Parse destination
    let destination: 'none' | 'sqs' | 's3' | 'both';
    switch (destStr) {
      case 'sqs':
        destination = 'sqs';
        break;
      case 's3':
        destination = 's3';
        break;
      case 'both':
        destination = 'both';
        break;
      default:
        destination = 'none';
    }
    
    return {
      enabled,
      destination,
      awsRegion
    };
  }

  async getSettingsConfig(): Promise<{
    maxConcurrentRequests: number;
    requestTimeout: number;
  }> {
    return this.loadConfigFile('settings.json', {
      maxConcurrentRequests: 10,
      requestTimeout: 30000
    });
  }

  async getConfig(): Promise<MCPServerConfig> {
    const [loggerConfig, metricsConfig, settingsConfig] = await Promise.all([
      this.getLoggerConfig(),
      this.getMetricsConfig(),
      this.getSettingsConfig()
    ]);

    return {
      logLevel: loggerConfig.logLevel,
      metrics: metricsConfig,
      settings: settingsConfig
    };
  }
} 