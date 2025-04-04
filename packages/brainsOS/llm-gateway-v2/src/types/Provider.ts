export interface ProviderConfig {
  name: string;
  region?: string;
  apiVersion?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  vendorConfigs?: Record<string, ProviderVendorConfig>;
}

export interface ProviderVendorConfig {
  apiVersion?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
} 