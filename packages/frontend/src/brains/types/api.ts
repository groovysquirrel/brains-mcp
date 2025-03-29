/**
 * API Types
 * 
 * Types for API requests, responses, and error handling.
 */

/**
 * Generic API Response
 */
export interface APIResponse<T> {
  success: boolean;
  data?: T;
  error?: APIError;
  metadata: {
    requestId?: string;
    processingTimeMs: number;
    timestamp: string;
    modelId?: string;
  };
}

/**
 * API Error Structure
 */
export interface APIError {
  message: string;
  code: string;
  details: ErrorDetails;
}

/**
 * Error Details
 */
export interface ErrorDetails {
  statusCode: number;
  code: string;
  service?: string;
  operation?: string;
  modelId?: string;
  retryAfter?: string;
}

/**
 * Prompt Response Data
 */
export interface PromptResponseData {
  content?: string;
  response?: string;
  conversationId?: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
} 