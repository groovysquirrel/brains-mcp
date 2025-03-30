import { MCPData, MCPResponse } from '../mcpTypes';
import { resourceRegistry } from './mcpResourceIndex';
import { v4 as uuidv4 } from 'uuid';

// Common response helpers
function createErrorResponse(
  requestId: string,
  code: string,
  message: string,
  statusCode: number = 400,
  service: string = 'resources'
): MCPResponse {
  return {
    success: false,
    error: {
      code,
      message,
      details: {
        code,
        service,
        statusCode
      }
    },
    metadata: {
      requestId,
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    }
  };
}

function createSuccessResponse<T>(
  requestId: string,
  data: T
): MCPResponse<T> {
  return {
    success: true,
    content: [{
      text: JSON.stringify(data),
      data
    }],
    metadata: {
      requestId,
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    }
  };
}

export async function resourcesHandler(event: any): Promise<MCPResponse> {
  const requestId = uuidv4();
  const body = event.body ? JSON.parse(event.body) : {};
  
  console.log('[Resource Handler] Processing request:', {
    requestId,
    body,
    pathParams: event.pathParameters
  });

  // Get resource type from path parameters
  const resourceType = event.pathParameters?.name;
  if (!resourceType) {
    console.log('[Resource Handler] No resource type found in path parameters');
    return createErrorResponse(
      requestId,
      'INVALID_PATH',
      'Invalid resource path'
    );
  }

  // Get resource from registry
  const resource = resourceRegistry.getResource(resourceType);
  console.log('[Resource Handler] Resource lookup result:', {
    resourceType,
    found: !!resource,
    availableResources: resourceRegistry.listResources()
  });

  if (!resource) {
    console.log('[Resource Handler] Resource not found:', resourceType);
    return createErrorResponse(
      requestId,
      'RESOURCE_NOT_FOUND',
      `No resource found for type: ${resourceType}`,
      404
    );
  }

  try {
    // Handle the request using the resource's handler
    console.log('[Resource Handler] Calling resource handler with:', {
      type: resourceType,
      query: body.query || {}
    });

    const response = await resource.handler.handle({
      type: resourceType,
      query: body.query || {}
    });
    
    console.log('[Resource Handler] Resource handler response:', response);

    // Ensure the response has the correct request ID
    const finalResponse = {
      ...response,
      metadata: {
        ...response.metadata,
        requestId
      }
    };

    console.log('[Resource Handler] Final response:', finalResponse);
    return finalResponse;
  } catch (error) {
    console.error('[Resource Handler] Error handling request:', error);
    return createErrorResponse(
      requestId,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
} 