export interface InferenceTypes {
    onDemand: boolean;
    provisioned: boolean;
    streaming: boolean;
}

export interface ModelCapabilities {
    streaming: boolean;
    inferenceTypes: InferenceTypes;
}

export interface ModelConfig {
    modelId: string;
    provider: string;
    vendor: string;
    modality: string;
    capabilities: ModelCapabilities;
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