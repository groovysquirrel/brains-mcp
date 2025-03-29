/**
 * MCP (Modular Component Pattern) Types
 * This file defines all the types and interfaces used in the MCP system.
 * It provides type safety and validation for requests and responses.
 */

import { z } from 'zod';  // Zod is used for runtime type validation

/**
 * Base Types
 * These are the foundation types that all MCP components build upon
 */

// The base interface that all MCP components must implement
export interface MCPBase {
  type: string;  // Identifies what kind of component this is (e.g., 'calculator', 'joke')
}

// Used for tools that perform specific operations (e.g., calculator, random number generator)
export interface MCPTool extends MCPBase {
  params: Record<string, any>;  // Parameters needed for the tool to work
}

// Used for data retrieval operations (e.g., getting dog names, random facts)
export interface MCPData extends MCPBase {
  query?: Record<string, any>;  // Optional query parameters for filtering data
}

// Used for prompt-based operations (e.g., generating jokes, rap lyrics)
export interface MCPPrompt extends MCPBase {
  params: Record<string, any>;  // Parameters needed for the prompt (e.g., topic, style)
}

/**
 * Response Types
 * Defines how all responses from MCP components should be structured
 */

// The standard response format for all MCP operations
export interface MCPResponse<T = any> {
  success: boolean;  // Whether the operation was successful
  content?: {       // The actual result content (if successful)
    text: string;    // Text content of the response
    data?: T;        // Optional structured data
  }[];
  data?: T;         // Legacy data field (for backward compatibility)
  error?: {         // Error information (if unsuccessful)
    code: string;    // Error code for client handling
    message: string; // Human-readable error message
    details: {      // Additional error details
      code: string;      // Error code
      service: string;   // Which service generated the error
      statusCode: number; // HTTP status code
    };
  };
  metadata: {       // Information about the request/response
    requestId: string;      // Unique ID for this request
    processingTimeMs: number; // How long the request took
    timestamp: string;      // When the response was generated
  };
}

/**
 * Request Schemas
 * These Zod schemas validate incoming requests at runtime
 * They ensure that all requests have the correct structure
 */

// Validates tool requests (e.g., calculator operations)
export const MCPToolSchema = z.object({
  type: z.string(),
  params: z.record(z.any())
});

// Validates data requests (e.g., getting dog names)
export const MCPDataSchema = z.object({
  type: z.string(),
  query: z.record(z.any()).optional()
});

// Validates prompt requests (e.g., generating jokes)
export const MCPPromptSchema = z.object({
  type: z.string(),
  params: z.record(z.any())
});

/**
 * Handler Types
 * Defines how MCP handlers should be implemented
 */

// The interface that all MCP handlers must implement
export interface MCPHandler<T extends MCPBase, R = any> {
  handle(input: T): Promise<MCPResponse<R>>;  // Process the input and return a response
}

/**
 * Schema Types
 * Defines the structure of tool schemas and parameters
 */

// Schema for tool parameters
export interface MCPToolSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// Schema for data parameters
export interface MCPDataSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// Tool definition with schema and handler
export interface MCPToolDefinition<T extends MCPBase, R = any> {
  name: string;
  description: string;
  schema: MCPToolSchema;
  handler: MCPHandler<T, R>;
}

// Data provider definition with schema and handler
export interface MCPDataDefinition<T extends MCPBase, R = any> {
  name: string;
  description: string;
  schema: MCPDataSchema;
  handler: MCPHandler<T, R>;
}

/**
 * Registry Types
 * Defines how MCP handlers are registered and retrieved
 */

// The interface for managing MCP handlers
export interface MCPRegistry<T extends MCPBase> {
  // Register a new tool with its schema and handler
  registerTool(tool: MCPToolDefinition<T>): void;
  
  // Register a new data provider with its schema and handler
  registerResource(resource: MCPDataDefinition<T>): void;
  
  // Get a tool by its name
  getTool(name: string): MCPToolDefinition<T> | undefined;
  
  // Get a data provider by its name
  getResource(name: string): MCPDataDefinition<T> | undefined;
  
  // List all available tools
  listTools(): MCPToolDefinition<T>[];
  
  // List all available data providers
  listResources(): MCPDataDefinition<T>[];
  
  // Get the schema for a specific tool
  getToolSchema(name: string): MCPToolSchema | undefined;
  
  // Get the schema for a specific data provider
  getResourceSchema(name: string): MCPDataSchema | undefined;
}

/**
 * Request Context
 * Contains information about the current request
 * This is used throughout the MCP system for logging, tracking, and security
 */

export interface RequestContext {
  userId: string;    // Who made the request
  userArn: string;   // AWS ARN of the user
  requestId: string; // Unique ID for this request
  startTime: number; // When the request started
  type: string;      // Type of MCP operation
  name: string;      // Name of the specific operation
} 