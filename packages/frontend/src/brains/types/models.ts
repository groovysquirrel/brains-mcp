/**
 * Model Types
 * 
 * Types related to language models and their configuration.
 */

/**
 * Language Model Configuration
 */
export interface LLM {
  id: string;
  name: string;
  modelId: string;
  vendor: string;
  source: string;
  maxTokens: number;
  status: string;
  type: string;
  typeName: string;
  userId: string;
  updatedAt: string;
}

/**
 * Model Response Data
 */
export interface LLMResponseData {
  success: boolean;
  count: number;
  items: LLM[];
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  }
} 