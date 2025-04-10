export interface Model {
  id: string;
  name: string;
  displayName: string;
  description: string;
  contextWindow: number;
  maxTokens: number;
  defaultSettings: {
    temperature?: number;
    topP?: number;
    stopSequences?: string[];
  };
}

export interface VendorConfig {
  name: string;
  displayName: string;
  models?: Model[];  // Updated to use Model interface
  capabilities: {
    modalities: string[];  // e.g. ['text-to-text', 'text-to-image']
    streaming: boolean;
    inferenceTypes: {
      onDemand: boolean;
      provisioned: boolean;
    };
  };
  apiFormats: {
    messages?: {
      models: string[];
      format: {
        anthropic_version: string;
        messages: Array<{
          role: string;
          content: string;
        }>;
        max_tokens: number;
      };
    };
    prompt?: {
      models: string[];
      format: {
        prompt: string;
        max_tokens_to_sample: number;
      };
    };
  };
  modelApiMapping?: Record<string, 'messages' | 'prompt'>;  // Maps model IDs to their API format
  responseFormat: {
    messages?: {
      completionField: string;
      usageField: string;
    };
    prompt?: {
      completionField: string;
      usageField: string;
    };
  };
  specialHandling: {
    requiresSystemPrompt: boolean;
    supportsStopSequences: boolean;
    supportsTemperature: boolean;
  };
  defaultSettings?: {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stopSequences?: string[];
  };
  providerSpecific?: {
    modelPrefix?: string;
    responseField?: string;
    [key: string]: any;  // Allow other provider-specific settings
  };
} 