export enum Support {
    ON_DEMAND = 'ON_DEMAND',
    PROVISIONED = 'PROVISIONED'
  }

export enum InteractionType {
    CONVERSATION = 'conversation',
    INSTRUCTION = 'instruction'
}

export type InferenceType = 'text' | 'image' | 'embedding';

export interface FoundationModelSummary {
  modelId: string;
  modelName?: string;
  vendorName?: string;
  maxTokens?: number;
  inferenceTypesSupported?: InferenceType[];
}

export interface BedrockServiceErrorDetails {
  message: string;
  code?: string;
  requestId?: string;
}

export class BedrockServiceError extends Error {
  constructor(
    message: string,
    public details: BedrockServiceErrorDetails
  ) {
    super(message);
    this.name = 'BedrockServiceError';
  }
}