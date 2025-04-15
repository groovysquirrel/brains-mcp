import { MCPErrorResponse } from './MCPError';

export interface MCPPrompt {
  id: string;
  name: string;
  content: string;
  variables: string[];
  metadata: Record<string, any>;
}

export interface MCPPromptResponse {
  success: true;
  data: {
    prompt: string;
    variables: Record<string, any>;
  };
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
}

export type MCPPromptResult = MCPPromptResponse | MCPErrorResponse;

export interface MCPPromptRequest {
  requestType: 'prompt';
  requestId: string;
  promptId: string;
  variables: Record<string, any>;
}

export interface MCPPromptRegistry {
  registerPrompt(prompt: MCPPrompt): void;
  getPrompt(id: string): MCPPrompt | undefined;
  listPrompts(): MCPPrompt[];
} 