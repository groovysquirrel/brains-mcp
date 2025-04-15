/**
 * Core types for the MCP Tool system.
 * These types define the interfaces and structures used throughout the tool system.
 */

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
 * @template T - The type of data returned by the tool
 */
export interface ToolSuccessResponse<T> {
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

/**
 * Standard response format for failed tool operations.
 */
export interface ToolErrorResponse {
  /** Indicates the operation failed */
  success: false;
  /** Error information */
  error: {
    /** Error code for programmatic handling */
    code: string;
    /** Human-readable error message */
    message: string;
    /** Additional error details */
    details?: Record<string, any>;
  };
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

/**
 * Union type representing all possible tool responses
 * @template T - The type of data returned by the tool
 */
export type ToolResponse<T = any> = ToolSuccessResponse<T> | ToolErrorResponse;

/**
 * Interface for tool handlers that process tool requests.
 * @template T - The input type expected by the handler
 * @template R - The output type returned by the handler
 */
export interface ToolHandler<T = any, R = any> {
  /**
   * Processes a tool request and returns a response.
   * @param input - The input data for the tool
   * @returns A promise that resolves to a ToolResponse
   */
  handle(input: T): Promise<ToolResponse<R>>;
}

/**
 * Interface for tool modules that can be loaded by the ToolLoader.
 * Each tool module represents a complete tool implementation.
 */
export interface ToolModule {
  /** Unique identifier for the tool */
  name: string;
  /** Human-readable description of the tool's purpose */
  description: string;
  /** JSON Schema defining the tool's input/output structure */
  schema: ToolSchema;
  /** The handler that implements the tool's logic */
  handler: ToolHandler;
}

/**
 * Interface for tool implementations.
 * @template T - The input type expected by the tool
 * @template R - The output type returned by the tool
 */
export interface Tool<T = any, R = any> {
  /** Unique identifier for the tool */
  name: string;
  /** Human-readable description of the tool's purpose */
  description: string;
  /** JSON Schema defining the tool's input/output structure */
  schema: ToolSchema;
  /** The handler that implements the tool's logic */
  handler: ToolHandler<T, R>;
}

/**
 * Interface for tool loaders that discover and load tools from a directory.
 */
export interface ToolLoader {
  /**
   * Loads all tools from a specified directory.
   * @param directory - The directory path to search for tools
   * @returns A promise that resolves to an array of loaded tools
   */
  loadTools(directory: string): Promise<Tool[]>;
}

/**
 * Interface for tool requests.
 */
export interface ToolRequest {
  /** Type identifier for the request */
  requestType: 'tool';
  /** Unique identifier for the request */
  requestId: string;
  /** Name of the tool to invoke */
  toolName: string;
  /** Parameters to pass to the tool */
  parameters: Record<string, any>;
} 