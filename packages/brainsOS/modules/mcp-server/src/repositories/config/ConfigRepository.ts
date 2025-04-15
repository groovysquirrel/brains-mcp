import { LogLevel } from '../../../../utils/logging/Logger';

/**
 * Interface for MCP server configuration
 */
export interface MCPServerConfig {
  logLevel: LogLevel;
  metrics: {
    enabled: boolean;
    destination: 'none' | 'sqs' | 's3' | 'both';
    awsRegion: string;
  };
  settings: {
    maxConcurrentRequests: number;
    requestTimeout: number;
  };
}

/**
 * Interface that defines methods for loading MCP server configuration
 */
export interface ConfigRepository {
  /**
   * Gets the logger configuration
   */
  getLoggerConfig(): Promise<{ logLevel: LogLevel }>;
  
  /**
   * Gets the metrics configuration
   */
  getMetricsConfig(): Promise<{
    enabled: boolean;
    destination: 'none' | 'sqs' | 's3' | 'both';
    awsRegion: string;
  }>;
  
  /**
   * Gets the server settings configuration
   */
  getSettingsConfig(): Promise<{
    maxConcurrentRequests: number;
    requestTimeout: number;
  }>;
  
  /**
   * Gets the complete MCP server configuration
   */
  getConfig(): Promise<MCPServerConfig>;
} 