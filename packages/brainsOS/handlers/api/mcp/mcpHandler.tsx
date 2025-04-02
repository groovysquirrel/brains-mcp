/**
 * MCP (Model Context Protocol) Handler
 * 
 * This is the main entry point for all MCP API requests. It:
 * 1. Receives requests from the API Gateway
 * 2. Figures out what type of service is needed (tools, resources, or prompts)
 * 3. Routes the request to the right handler
 * 4. Returns a nicely formatted response
 */

import { 
  APIGatewayProxyHandlerV2WithIAMAuthorizer, 
  APIGatewayProxyResultV2 
} from 'aws-lambda';
import { createResponse, createFlattenedResponse } from '../../../utils/http/response';
import { toolsHandler } from '../../../mcp/tools/mcpToolHandler';
import { resourcesHandler } from '../../../mcp/resources/mcpResourceHandler';
import { promptsHandler } from '../../../mcp/prompts/mcpPromptHandler';
import { RequestContext, MCPResponse } from './mcpTypes';
import { toolsRegistry } from '../../../mcp/tools/mcpToolIndex';
import { resourceRegistry } from '../../../mcp/resources/mcpResourceIndex';
import { promptRegistry } from '../../../mcp/prompts/mcpPromptIndex';

/**
 * Custom error class for MCP-specific errors
 * Makes it easy to create errors with status codes and error codes
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
 * Formats a response from any MCP handler into our standard format
 * This ensures all responses look the same and include all necessary information
 */
function formatMCPResponse<T>(
  response: Partial<MCPResponse<T>>,
  context: RequestContext
): MCPResponse<T> {
  // Convert string errors into our standard error format
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

  // Build the complete response
  return {
    success: response.success ?? true,
    metadata: {
      requestId: context.requestId,
      processingTimeMs: Date.now() - context.startTime,
      timestamp: new Date().toISOString(),
      ...response.metadata
    },
    ...(response.content && { content: response.content }),
    ...(error && { error })
  };
}

/**
 * Gets a list of all available MCP services
 * Can be filtered by type (tools, resources, or prompts)
 */
async function getServiceIndex(type?: string): Promise<MCPResponse<any>> {
  const services: any = {};

  // Add prompts if requested
  if (!type || type === 'prompts') {
    services.prompts = promptRegistry.listPrompts().map(prompt => ({
      name: prompt.name,
      description: prompt.description,
      schema: prompt.schema
    }));
  }

  // Add resources if requested
  if (!type || type === 'resources') {
    services.resources = resourceRegistry.listResources().map(resource => ({
      name: resource.name,
      description: resource.description,
      schema: resource.schema
    }));
  }

  // Add tools if requested
  if (!type || type === 'tools') {
    services.tools = toolsRegistry.listTools().map(tool => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema
    }));
  }

  return {
    success: true,
    content: [{
      text: JSON.stringify(services),
      data: services
    }],
    metadata: {
      requestId: '',
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Main handler function that processes all MCP API requests
 * This is where all requests start their journey
 */
export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event): Promise<APIGatewayProxyResultV2> => {
  try {
    // Log the incoming request
    console.log('[MCP Handler] Incoming event:', {
      path: event.rawPath,
      method: event.requestContext.http.method,
      body: event.body ? JSON.parse(event.body) : null,
      pathParams: event.pathParameters,
      queryParams: event.queryStringParameters,
      headers: event.headers
    });

    // Set up the request context
    const requestContext = await initializeRequestContext(event);
    console.log('[MCP Handler] Request context:', {
      ...requestContext,
      flattenResponse: requestContext.flattenResponse,
      queryParams: event.queryStringParameters
    });
    
    // Route to the right handler based on type
    let response: MCPResponse<any>;
    switch (requestContext.type) {
      case 'index':
        console.log('[MCP Handler] Handling index request');
        response = await getServiceIndex(requestContext.name);
        break;
      case 'tools':
        console.log('[MCP Handler] Routing to tools handler');
        response = await toolsHandler(event);
        break;
      case 'resources':
        console.log('[MCP Handler] Routing to resources handler');
        response = await resourcesHandler(event);
        break;
      case 'prompts':
        console.log('[MCP Handler] Routing to prompts handler');
        response = await promptsHandler(event);
        break;
      default:
        console.log('[MCP Handler] Invalid type:', requestContext.type);
        response = {
          success: false,
          error: {
            code: 'METHOD_NOT_ALLOWED',
            message: 'Method not allowed',
            details: {
              code: 'METHOD_NOT_ALLOWED',
              service: 'mcp',
              statusCode: 405
            }
          },
          metadata: {
            requestId: requestContext.requestId,
            processingTimeMs: Date.now() - requestContext.startTime,
            timestamp: new Date().toISOString()
          }
        };
    }

    console.log('[MCP Handler] Handler response:', response);

    // Format the response
    const formattedResponse: MCPResponse<any> = {
      success: response.success,
      metadata: {
        requestId: requestContext.requestId,
        processingTimeMs: Date.now() - requestContext.startTime,
        timestamp: new Date().toISOString(),
        ...response.metadata
      },
      ...(response.content && { content: response.content }),
      ...(response.error && { error: response.error })
    };

    console.log('[MCP Handler] Final formatted response:', formattedResponse);
    console.log('[MCP Handler] Using flattened response:', requestContext.flattenResponse);

    // Return either a flattened or regular response
    return requestContext.flattenResponse 
      ? createFlattenedResponse(200, formattedResponse)
      : createResponse(200, formattedResponse);
  } catch (error) {
    return createErrorResponse(error, event.requestContext.requestId);
  }
};

/**
 * Sets up the request context with user information and request details
 * This is where we validate the request and extract important information
 */
async function initializeRequestContext(event: any): Promise<RequestContext> {
  console.log('[MCP Handler] Initializing request context:', {
    path: event.rawPath,
    pathParams: event.pathParameters,
    queryParams: event.queryStringParameters,
    requestContext: event.requestContext
  });

  // Check if the user is authenticated
  const userId = event.requestContext.authorizer?.iam?.userId;
  if (!userId) {
    throw new Error('Unauthorized - missing user context');
  }

  // Extract type and name from the path
  const pathParts = event.rawPath.split('/').filter(Boolean); // Remove empty strings
  console.log('[MCP Handler] Path parts:', pathParts);

  // Find the index after 'mcp' to get the correct type and name
  const mcpIndex = pathParts.indexOf('mcp');
  const type = pathParts[mcpIndex + 1] || '';  // e.g., 'index' or 'resources'
  const name = pathParts[mcpIndex + 2];         // e.g., 'prompts' or 'dog-names'

  console.log('[MCP Handler] Extracted path parameters:', { type, name });

  // Validate the MCP type
  if (!type || !['tools', 'resources', 'prompts', 'index'].includes(type)) {
    throw new Error('Invalid MCP type. Supported types: tools, resources, prompts, index');
  }

  // Name is required for non-index routes
  if (type !== 'index' && !name) {
    throw new Error('Missing name parameter');
  }

  // Get flatten parameter from query string
  const flattenResponse = event.queryStringParameters?.flatten === 'true';
  console.log('[MCP Handler] Flatten response parameter:', {
    raw: event.queryStringParameters?.flatten,
    parsed: flattenResponse
  });

  // Return the complete request context
  return {
    userId,
    userArn: event.requestContext.authorizer?.iam?.userArn,
    requestId: event.requestContext.requestId,
    startTime: Date.now(),
    type,
    name,
    flattenResponse
  };
}

/**
 * Creates a response for when an HTTP method is not allowed
 * This is used when someone tries to use the wrong HTTP method
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
  // Figure out the right status code and error code
  const statusCode = error instanceof MCPError ? error.statusCode : 500;
  const code = error instanceof MCPError ? error.code : 'INTERNAL_ERROR';
  
  // Create the error response
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