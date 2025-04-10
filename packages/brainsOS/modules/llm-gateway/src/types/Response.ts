export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface GatewayResponse {
  content: string;
  usage?: TokenUsage;
  metadata?: Record<string, unknown>;
} 