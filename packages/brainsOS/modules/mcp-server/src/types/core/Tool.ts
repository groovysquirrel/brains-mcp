import { MCPErrorResponse } from '../MCPError';

/**
 * Schema definition for tool input/output parameters
 */
export interface ToolSchema {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
      required?: string[];
    };
  };
}

/**
 * Standard response format for successful tool operations.
 */
export interface ToolSuccessResponse<T> {
  success: true;
  data: T;
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
}

/**
 * Union type representing all possible tool responses
 */
export type ToolResponse<T = any> = ToolSuccessResponse<T> | MCPErrorResponse;

/**
 * Interface for tool handlers that process tool requests.
 */
export interface ToolHandler<T = any, R = any> {
  handle(input: T): Promise<ToolResponse<R>>;
}

/**
 * Interface for tool implementations.
 */
export interface Tool<T = any, R = any> {
  name: string;
  description: string;
  schema: ToolSchema;
  handler: ToolHandler<T, R>;
}

/**
 * Interface for tool requests.
 */
export interface ToolRequest {
  requestType: 'tool';
  requestId: string;
  toolName: string;
  parameters: Record<string, any>;
}

/**
 * Interface for tool registry.
 */
export interface ToolRegistry {
  registerTool(tool: Tool): void;
  getTool(name: string): Tool | undefined;
  listTools(): Tool[];
}

/**
 * Interface for tool information
 */
export interface ToolInfo {
  name: string;
  description: string;
  schema: ToolSchema;
} 