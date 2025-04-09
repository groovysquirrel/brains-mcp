export interface InferenceTypes {
  onDemand: boolean;
  provisioned: boolean;
  streaming: boolean;
}

/**
 * Cost per token structure for input and output tokens
 */
export interface CostPerToken {
  onDemand: number | {
    input: number;
    output: number;
  };
  provisioned?: number | {
    input: number;
    output: number;
  };
}

export interface ModelCapabilities {
  streaming: boolean;
  modalities: {
    input: string[];
    output: string[];
  };
  lifecycle: string;
  customization: {
    supported: boolean;
    types: string[];
  };
  inferenceTypes: InferenceTypes;
}

export interface ModelAccess {
  onDemand: boolean;
  provisionable: boolean;
}

export interface ModelStatus {
  gateway: string;
  connection: string;
}

export interface ModelConfig {
  modelId: string;
  provider: string;
  vendor: string;
  capabilities: ModelCapabilities;
  access: ModelAccess;
  status: ModelStatus;
  displayName?: string;
  description?: string;
  aliases?: string[];
  costPerToken?: CostPerToken; // Cost per token data
}

export interface ModelsConfiguration {
  models: ModelConfig[];
  lastUpdated: string;
}

export function getDefaultConfig(): ModelsConfiguration {
  return {
    models: [],
    lastUpdated: new Date().toISOString()
  };
}

export interface ModelConfigWithAliases extends ModelConfig {
  aliases?: string[];
} 