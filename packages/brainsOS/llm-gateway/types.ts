// Provider types
export type Provider = 'bedrock' | 'openai' | 'anthropic';

// Model types for each provider
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

export type OpenAIModel = 'gpt-4' | 'gpt-4-turbo-preview' | 'gpt-3.5-turbo';
export type AnthropicModel = 'claude-3-opus-20240229' | 'claude-3-sonnet-20240229' | 'claude-3-haiku-20240307';

// Union type for all model IDs
export type ModelId = BedrockModel | OpenAIModel | AnthropicModel;

// Message types
export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

// Model configuration
export interface ModelConfig {
  provider: Provider;
  modelId: ModelId;
  maxTokens?: number;
  temperature?: number;
}

// Chat request
export interface ChatRequest {
  messages: Message[];
  modelConfig: ModelConfig;
  systemPrompt?: string;
  metadata?: Record<string, unknown>;
}

// Usage information
export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

// Chat response
export interface ChatResponse {
  content: string;
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
}

// Provider configuration
export interface ProviderConfig {
  region?: string;
  apiKey?: string;
  apiVersion?: string;
  defaultMaxTokens?: number;
  defaultTemperature?: number;
  organizationId?: string;
}

// Provider-specific configurations
export interface BedrockConfig extends ProviderConfig {
  vendorConfigs?: {
    anthropic?: {
      apiVersion?: string;
      defaultMaxTokens?: number;
      defaultTemperature?: number;
    };
    meta?: {
      apiVersion?: string;
      defaultMaxTokens?: number;
      defaultTemperature?: number;
    };
    mistral?: {
      apiVersion?: string;
      defaultMaxTokens?: number;
      defaultTemperature?: number;
    };
  };
}

export interface OpenAIConfig extends ProviderConfig {
  organizationId?: string;
}

export interface AnthropicConfig extends ProviderConfig {
  organizationId?: string;
}

// Provider adapter interface
export interface ProviderAdapter {
  initialize(config: ProviderConfig): Promise<void>;
  chat(request: ChatRequest): Promise<ChatResponse>;
  streamChat(request: ChatRequest): AsyncGenerator<ChatResponse>;
  getModelCapabilities(modelId: ModelId): Promise<{
    supportsStreaming: boolean;
    inputModalities: string[];
    outputModalities: string[];
  }>;
}

// LLM Gateway configuration
export interface LLMGatewayConfig {
  bedrock?: BedrockConfig;
  openai?: OpenAIConfig;
  anthropic?: AnthropicConfig;
}

// WebSocket message types
export interface WebSocketMessage {
  type: 'chat' | 'stream' | 'stream_complete' | 'error';
  content?: string;
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
  message?: string;
  timestamp: string;
}

export interface ModelCapabilities {
  maxTokens: number;
  supportsStreaming: boolean;
  supportsFunctionCalling: boolean;
  supportedMessageTypes: string[];
  apiVersion: string;
  vendor: string;
  modelId: string;
  inferenceTypes: string[];
  inputModalities: string[];
  outputModalities: string[];
} 