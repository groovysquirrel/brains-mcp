/**
 * MCP (Modular Component Pattern) Handler
 * This file handles all requests to the MCP API endpoints.
 * It routes requests to the appropriate handler (tools, resources, or prompts)
 * and ensures all responses follow a consistent format.
 */

import { 
  APIGatewayProxyHandlerV2WithIAMAuthorizer, 
  APIGatewayProxyResultV2 
} from 'aws-lambda';
import { createResponse } from '../utils/http/response';
import { toolsHandler } from './tools/mcpToolHandler';
import { resourcesHandler } from './resources/mcpResourceHandler';
import { promptsHandler } from './prompts/mcpPromptHandler';
import { RequestContext, MCPResponse } from './mcpTypes';

/**
 * Custom error class for MCP-specific errors
 * This helps us handle errors in a consistent way across the application
 */
class MCPError extends Error {
  statusCode: number;  // HTTP status code (e.g., 404, 500)
  code: string;        // Error code for client handling

  constructor(message: string, statusCode = 404, code = 'NOT_FOUND') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Formats a response from any MCP handler into a standard format
 * This ensures all responses have the same structure with:
 * - success flag
 * - metadata (request ID, timing, etc.)
 * - data or error information
 */
function formatMCPResponse<T>(
  response: Partial<MCPResponse<T>>,
  context: RequestContext
): MCPResponse<T> {
  // If there's an error, convert it to our standard error format
  const error = response.error 
    ? typeof response.error === 'string'
      ? {
          code: 'ERROR',
          message: response.error,
          details: {
            code: 'ERROR',
            service: 'mcp',
            statusCode: 500
          }
        }
      : response.error
    : undefined;

  // Build the complete response with all required fields
  return {
    success: response.success ?? true,
    metadata: {
      requestId: context.requestId,
      processingTimeMs: Date.now() - context.startTime,
      timestamp: new Date().toISOString(),
      ...response.metadata
    },
    ...(response.data && { data: response.data }),
    ...(error && { error })
  };
}

/**
 * Main handler function that processes all MCP API requests
 * This is the entry point for all MCP-related API calls
 */
export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event): Promise<APIGatewayProxyResultV2> => {
  try {
    // Initialize request context
    const requestContext = await initializeRequestContext(event);
    
    // Route request based on type
    let response: { data?: any; error?: string | { code: string; message: string; details: { code: string; service: string; statusCode: number } } };
    switch (requestContext.type) {
      case 'tools':
        response = await toolsHandler(event);
        break;
      case 'resources':
        response = await resourcesHandler(event);
        break;
      case 'prompts':
        response = await promptsHandler(event);
        break;
      default:
        response = createMethodNotAllowedResponse(requestContext);
    }

    // Format the response
    const formattedResponse: MCPResponse<any> = {
      success: !response.error,
      metadata: {
        requestId: requestContext.requestId,
        processingTimeMs: Date.now() - requestContext.startTime,
        timestamp: new Date().toISOString()
      },
      ...(response.data && { 
        content: [{
          text: JSON.stringify(response.data),
          data: response.data
        }]
      }),
      ...(response.error && { 
        error: typeof response.error === 'string' 
          ? {
              code: 'ERROR',
              message: response.error,
              details: {
                code: 'ERROR',
                service: 'mcp',
                statusCode: 500
              }
            }
          : response.error
      })
    };

    return createResponse(200, formattedResponse);
  } catch (error) {
    return createErrorResponse(error, event.requestContext.requestId);
  }
};

/**
 * Sets up the request context with user information and request details
 * This function validates the request and extracts important information
 */
async function initializeRequestContext(event: any): Promise<RequestContext> {
  // Check if the user is authenticated
  const userId = event.requestContext.authorizer?.iam?.userId;
  if (!userId) {
    throw new Error('Unauthorized - missing user context');
  }

  // Validate the MCP type (tools, resources, or prompts)
  const type = event.pathParameters?.type;
  if (!type || !['tools', 'resources', 'prompts'].includes(type)) {
    throw new Error('Invalid MCP type. Supported types: tools, resources, prompts');
  }

  // Check if a name parameter was provided
  const name = event.pathParameters?.name;
  if (!name) {
    throw new Error('Missing name parameter');
  }

  // Return the complete request context
  return {
    userId,
    userArn: event.requestContext.authorizer?.iam?.userArn,
    requestId: event.requestContext.requestId,
    startTime: Date.now(),
    type,
    name
  };
}

/**
 * Creates a response for when an HTTP method is not allowed
 * This is used when someone tries to use the wrong HTTP method (e.g., GET instead of POST)
 */
function createMethodNotAllowedResponse(context: RequestContext): { error: string } {
  return {
    error: 'Method not allowed'
  };
}

/**
 * Creates a standardized error response
 * This ensures all errors are returned in the same format
 */
function createErrorResponse(error: any, requestId: string): APIGatewayProxyResultV2 {
  // Determine the appropriate status code and error code
  const statusCode = error instanceof MCPError ? error.statusCode : 500;
  const code = error instanceof MCPError ? error.code : 'INTERNAL_ERROR';
  
  // Create the error response with all required fields
  const response: MCPResponse = {
    success: false,
    metadata: {
      requestId,
      processingTimeMs: Date.now(),
      timestamp: new Date().toISOString()
    },
    error: {
      code,
      message: error.message,
      details: {
        code,
        service: 'mcp',
        statusCode
      }
    }
  };

  // Return the error response
  return createResponse(statusCode, response);
} 