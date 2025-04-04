export interface ModelCapabilities {
  modalities: string[];
  streaming: boolean;
  provisioned: boolean;
  inputModalities: string[];
  outputModalities: string[];
  maxTokens?: number;
  temperatureRange?: {
    min: number;
    max: number;
  };
  imageSizes?: string[];
}

export interface ModelConfig {
  modelId: string;
  aliases?: string[];
  provider: string;
  vendor: string;
  modality: string;
  capabilities: ModelCapabilities;
  maxTokens?: number;
  temperature?: number;
  vendorConfig?: Record<string, unknown>;
} 