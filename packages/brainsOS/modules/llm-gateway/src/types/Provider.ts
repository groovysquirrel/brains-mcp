export interface ProviderConfig {
  name: string;
  type: string;  // e.g. 'bedrock'
  region?: string;
  apiVersion?: string;
  vendors: string[];  // List of supported vendor names
  capabilities: {
    streaming: boolean;
    provisioning: {
      onDemand: boolean;
      provisioned: boolean;
    };
  };
  settings: {
    maxConcurrentRequests?: number;
    requestTimeout?: number;
  };
  vendorConfigs?: Record<string, ProviderVendorConfig>;
  defaultSettings?: {
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

export interface ProviderVendorConfig {
  apiVersion?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  endpointOverride?: string;
} 