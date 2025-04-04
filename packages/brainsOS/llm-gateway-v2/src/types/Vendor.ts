export interface VendorConfig {
  name: string;
  promptFormat: {
    systemPrompt: string;
    userPrompt: string;
    assistantPrompt: string;
  };
  responseFormat: {
    completionField: string;
    usageField: string;
  };
  specialHandling: {
    requiresSystemPrompt: boolean;
    supportsStopSequences: boolean;
    supportsTemperature: boolean;
  };
} 