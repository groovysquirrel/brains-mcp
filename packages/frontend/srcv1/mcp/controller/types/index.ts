/**
 * Core MCP types for controller logic
 */

export interface MCPConfig {
  llm: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  server: {
    wsUrl: string;
    apiUrl: string;
  };
  apiUrl: string;
  apiKey?: string;
  systemPromptContext?: string;
}

export interface MCPResource {
  id: string;
  type: string;
  name: string;
  content: any;
  metadata?: Record<string, any>;
}

export interface MCPSession {
  id: string;
  startTime: number;
  endTime?: number;
  status: 'active' | 'completed' | 'error';
}

export interface MCPActivity {
  id: string;
  sessionId: string;
  type: string;
  status: string;
  timestamp: number;
  details?: Record<string, any>;
}

export interface MCPWebSocketMessage {
  type: string;
  payload: any;
}

export interface MCPState {
  isConnected: boolean;
  error: string | null;
  activeResources: any[];
  activities: any[];
} 