export interface APIMetadata {
  processingTimeMs: number;
  timestamp: string;
  requestId?: string;
  promptType?: string;
  modelId?: string;
  modelSource?: string;
}

export interface BedrockServiceError {
  code: string;
  service: string;
  statusCode: number;
  operation: string;
  modelId: string;
  vendor: string;
}

export interface APIError {
  code: string;
  message: string;
  details?: BedrockServiceError;
}

export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: APIMetadata;
} 