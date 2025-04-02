/**
 * MCP (Modular Component Pattern) Types
 * 
 * This file defines the core types used in the MCP system.
 * Think of MCP as a way to organize different types of AI-powered services:
 * - Tools: Services that do specific tasks (like calculating or generating random numbers)
 * - Resources: Services that provide data (like dog names or random facts)
 * - Prompts: Services that generate text based on prompts (like creating jokes or summaries)
 */

import { z } from 'zod';  // Used for validating data at runtime

/**
 * Core Types
 * These are the basic building blocks that all MCP services use
 */

// Every MCP service needs a type to identify what it does
export interface MCPBase {
  type: string;  // e.g., 'calculator', 'dog-names', 'joke-generator'
}

// Tools are services that do specific tasks
export interface MCPTool extends MCPBase {
  params: Record<string, any>;  // Parameters needed for the tool
}

// Resources are services that provide data
export interface MCPData extends MCPBase {
  query?: Record<string, any>;  // Optional filters for the data
}

// Prompts are services that generate text
export interface MCPPrompt extends MCPBase {
  params: Record<string, any>;  // Parameters that guide the text generation
}

/**
 * Response Format
 * All MCP services return responses in this standard format
 */
export interface MCPResponse<T = any> {
  success: boolean;  // Did the operation succeed?
  
  // If successful, the response includes content
  content?: {
    text: string;    // Human-readable text
    data?: T;        // Structured data (if any)
  }[];
  
  // If unsuccessful, the response includes error details
  error?: {
    code: string;    // Error code (e.g., 'NOT_FOUND')
    message: string; // Human-readable error message
    details: {
      code: string;      // Error code
      service: string;   // Which service had the error
      statusCode: number; // HTTP status code
    };
  };
  
  // Metadata about the request/response
  metadata: {
    requestId: string;      // Unique ID for this request
    processingTimeMs: number; // How long it took
    timestamp: string;      // When it happened
  };
}

/**
 * Request Validation
 * These schemas ensure that incoming requests have the correct structure
 */
export const MCPToolSchema = z.object({
  type: z.string(),
  params: z.record(z.any())
});

export const MCPDataSchema = z.object({
  type: z.string(),
  query: z.record(z.any()).optional()
});

export const MCPPromptSchema = z.object({
  type: z.string(),
  params: z.record(z.any())
});

/**
 * Service Definitions
 * These interfaces define what information we need about each type of service
 */

// Common schema structure for all services
export interface ServiceSchema {
  type: 'function';
  function: {
    name: string;
    description: string;
    parameters: Record<string, any>;
  };
}

// Tool definition
export interface MCPToolDefinition<T extends MCPTool, R = any> {
  name: string;           // What the tool is called
  description: string;    // What the tool does
  schema: ServiceSchema;  // What parameters it needs
  handler: MCPHandler<T, R>;  // How to use it
}

// Resource definition
export interface MCPDataDefinition<T extends MCPData, R = any> {
  name: string;           // What the resource is called
  description: string;    // What data it provides
  schema: ServiceSchema;  // What filters it accepts
  handler: MCPHandler<T, R>;  // How to get the data
}

// Prompt definition
export interface MCPPromptDefinition<T extends MCPPrompt, R = any> {
  name: string;           // What the prompt is called
  description: string;    // What it generates
  schema: ServiceSchema;  // What parameters it needs
  handler: MCPHandler<T, R>;  // How to use it
}

/**
 * Service Handlers
 * Every service needs a handler that processes requests
 */
export interface MCPHandler<T extends MCPBase, R = any> {
  handle(input: T): Promise<MCPResponse<R>>;
}

/**
 * Service Registries
 * These interfaces define how we manage our services
 */

// Common registry methods
export interface Registry<T> {
  register(item: T): void;
  get(name: string): T | undefined;
  list(): T[];
  getSchema(name: string): ServiceSchema | undefined;
}

// Tool registry
export interface MCPToolRegistry<T extends MCPTool> extends Registry<MCPToolDefinition<T>> {
  registerTool(tool: MCPToolDefinition<T>): void;
  getTool(name: string): MCPToolDefinition<T> | undefined;
  listTools(): MCPToolDefinition<T>[];
  getToolSchema(name: string): ServiceSchema | undefined;
}

// Resource registry
export interface MCPResourceRegistry<T extends MCPData> extends Registry<MCPDataDefinition<T>> {
  registerResource(resource: MCPDataDefinition<T>): void;
  getResource(name: string): MCPDataDefinition<T> | undefined;
  listResources(): MCPDataDefinition<T>[];
  getResourceSchema(name: string): ServiceSchema | undefined;
}

// Prompt registry
export interface MCPPromptRegistry<T extends MCPPrompt> extends Registry<MCPPromptDefinition<T>> {
  registerPrompt(prompt: MCPPromptDefinition<T>): void;
  getPrompt(name: string): MCPPromptDefinition<T> | undefined;
  listPrompts(): MCPPromptDefinition<T>[];
  getPromptSchema(name: string): ServiceSchema | undefined;
}

/**
 * Request Context
 * Information about the current request that's useful throughout the system
 */
export interface RequestContext {
  userId: string;    // Who made the request
  userArn: string;   // AWS ARN of the user
  requestId: string; // Unique ID for this request
  startTime: number; // When the request started
  type: string;      // Type of MCP operation
  name: string;      // Name of the specific operation
  flattenResponse?: boolean; // Whether to flatten the response
} 