import { BaseMessage } from "@langchain/core/messages";

export type ModelProvider = 'bedrock';

export type BedrockModel = 
  | 'anthropic.claude-3-sonnet-20240229-v1:0'
  | 'anthropic.claude-3-haiku-20240307-v1:0'
  | 'anthropic.claude-2.1'
  | 'anthropic.claude-2'
  | 'anthropic.claude-instant-v1'
  | 'meta.llama2-13b-chat-v2:0'
  | 'meta.llama2-70b-chat-v2:0'
  | 'meta.llama2-7b-chat-v2:0'
  | 'mistral.mistral-7b-instruct-v0:2'
  | 'mistral.mixtral-8x7b-instruct-v0:1'
  | 'mistral.mistral-large-2402-v0:1';

export interface ModelConfig {
  provider: ModelProvider;
  modelId: BedrockModel;
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  topK?: number;
  stopSequences?: string[];
}

export interface ChatRequest {
  messages: BaseMessage[];
  modelConfig: ModelConfig;
  systemPrompt?: string;
  metadata?: Record<string, any>;
}

export interface ChatResponse {
  content: string;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  metadata?: Record<string, any>;
}

export interface ModelCapabilities {
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportedMessageTypes: string[];
}

export interface ProviderConfig {
  region?: string;
  credentials?: {
    accessKeyId: string;
    secretAccessKey: string;
  };
} 