export enum MCPErrorCode {
  TOOL_NOT_FOUND = 'TOOL_NOT_FOUND',
  INVALID_REQUEST = 'INVALID_REQUEST',
  TOOL_EXECUTION_ERROR = 'TOOL_EXECUTION_ERROR',
  TIMEOUT = 'TIMEOUT',
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  PROMPT_ERROR = 'PROMPT_ERROR',
  TRANSFORMER_ERROR = 'TRANSFORMER_ERROR',
  CONCURRENT_REQUEST_LIMIT = 'CONCURRENT_REQUEST_LIMIT',
  TRANSFORMER_NOT_FOUND = 'TRANSFORMER_NOT_FOUND'
}

export class MCPError extends Error {
  constructor(
    public code: MCPErrorCode,
    message: string,
    public metadata?: Record<string, unknown>
  ) {
    super(message);
    this.name = 'MCPError';
  }
}

export interface MCPErrorResponse {
  success: false;
  error: {
    code: MCPErrorCode;
    message: string;
    metadata?: Record<string, unknown>;
  };
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
} 