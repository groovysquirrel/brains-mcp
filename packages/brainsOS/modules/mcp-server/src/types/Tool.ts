import { MCPErrorResponse } from './MCPError';

export interface MCPToolSchema {
  type: string;
  function: {
    name: string;
    description: string;
    parameters: {
      type: string;
      properties: Record<string, any>;
    };
  };
}

/**
 * Interface for handlers that process tool requests.
 * @template T - The input type expected by the handler
 * @template R - The output type returned by the handler
 */
export interface MCPHandler<T, R> {
  /**
   * Processes a tool request and returns a response.
   * @param input - The input data for the tool
   * @returns A promise that resolves to a response
   */
  handle(input: T): Promise<MCPResponse<R> | MCPErrorResponse>;
}

/**
 * Standard response format for successful tool operations.
 * @template T - The type of data returned by the tool
 */
export interface MCPResponse<T> {
  /** Indicates the operation was successful */
  success: true;
  /** The result data from the tool operation */
  data: T;
  /** Metadata about the request and response */
  metadata: {
    /** Unique identifier for the request */
    requestId: string;
    /** Time taken to process the request in milliseconds */
    processingTimeMs: number;
    /** ISO timestamp of when the response was generated */
    timestamp: string;
  };
}

export type MCPResult<T> = MCPResponse<T> | MCPErrorResponse;

/**
 * Interface for tool implementations.
 * @template T - The input type expected by the tool
 * @template R - The output type returned by the tool
 */
export interface MCPTool<T = any, R = any> {
  /** Unique identifier for the tool */
  name: string;
  /** Human-readable description of the tool's purpose */
  description: string;
  /** JSON Schema defining the tool's input/output structure */
  schema: MCPToolSchema;
  /** The handler that implements the tool's logic */
  handler: MCPHandler<T, R>;
}

export interface MCPToolRequest {
  requestType: 'tool';
  requestId: string;
  toolName: string;
  parameters: Record<string, any>;
}

export interface MCPToolRegistry {
  registerTool(tool: MCPTool): void;
  getTool(name: string): MCPTool | undefined;
  listTools(): MCPTool[];
} 