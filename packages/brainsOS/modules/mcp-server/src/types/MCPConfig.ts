export interface MCPConfig {
  defaultTimeoutMs: number;
  maxConcurrentRequests: number;
  metricsEnabled: boolean;
  toolConfig?: {
    defaultTimeoutMs?: number;
    maxRetries?: number;
  };
  resourceConfig?: {
    storageType?: 'memory' | 'file' | 'database';
    storagePath?: string;
  };
  promptConfig?: {
    templatePath?: string;
    cacheEnabled?: boolean;
  };
  transformerConfig?: {
    cacheEnabled?: boolean;
    maxCacheSize?: number;
  };
} 