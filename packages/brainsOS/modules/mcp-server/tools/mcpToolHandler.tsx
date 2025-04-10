import { MCPTool, MCPResponse } from '../mcpTypes';
import { toolsRegistry } from './mcpToolIndex';
import { v4 as uuidv4 } from 'uuid';

// Common response helpers
function createErrorResponse(
  requestId: string,
  code: string,
  message: string,
  statusCode: number = 400,
  service: string = 'tools'
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

export async function toolsHandler(event: any): Promise<MCPResponse> {
  const requestId = uuidv4();
  const path = event.path;
  const body = JSON.parse(event.body || '{}') as MCPTool;
  
  // Extract tool type from path
  const toolType = path.split('/').pop();
  if (!toolType) {
    return createErrorResponse(
      requestId,
      'INVALID_PATH',
      'Invalid tool path'
    );
  }

  // Get tool from registry
  const tool = toolsRegistry.getTool(toolType);
  if (!tool) {
    return createErrorResponse(
      requestId,
      'TOOL_NOT_FOUND',
      `No tool found for type: ${toolType}`,
      404
    );
  }

  try {
    // Handle the request using the tool's handler
    const response = await tool.handler.handle(body);
    
    // Ensure the response has the correct request ID
    return {
      ...response,
      metadata: {
        ...response.metadata,
        requestId
      }
    };
  } catch (error) {
    return createErrorResponse(
      requestId,
      'INTERNAL_ERROR',
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
} 