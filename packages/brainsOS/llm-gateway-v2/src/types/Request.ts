export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GatewayRequest {
  provider: string;
  vendor?: string;
  modelId: string;
  messages?: Message[];
  prompt?: string;
  modality: string;
  streaming?: boolean;
  provisioned?: boolean;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  metadata?: Record<string, unknown>;
} 