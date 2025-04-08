export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface GatewayRequest {
  // Message array for single requests or when starting a new conversation
  messages?: Array<{
    role: string;
    content: string;
  }>;
  
  // Single message content (legacy support)
  prompt?: string;
  
  // Provider and model selection
  provider?: string;
  modelId?: string;
  
  // Conversation tracking
  conversationId?: string;  // If provided, the gateway will fetch and include conversation history
  userId?: string;          // Required when conversationId is provided
  
  // Modality (text, image, audio, etc.)
  modality?: string;
  
  // Streaming flag
  streaming?: boolean;
  
  // Token grouping for streaming responses
  tokenGrouping?: number;
  
  // Model parameters
  maxTokens?: number;
  temperature?: number;
  topP?: number;
  systemPrompt?: string;
  
  // Additional parameters
  stopSequences?: string[];
  
  // Arbitrary metadata
  metadata?: Record<string, unknown>;
} 