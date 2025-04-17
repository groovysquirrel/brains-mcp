/**
 * ToolRequestHandler is responsible for processing incoming tool requests.
 * It validates requests, looks up the appropriate tool, and handles the execution
 * of the tool's logic.
 */

import { Tool, ToolResponse, ToolRequest } from '../../../types';
import { MCPErrorCode } from '../../../types/MCPError';
import { ToolRepository } from '../../../repositories/services/ToolRepository';
import { v4 as uuidv4 } from 'uuid';

const toolRepository = ToolRepository.getInstance();

/**
 * Creates an error response for failed tool operations.
 * @param requestId - Unique identifier for the request
 * @param code - Error code for programmatic handling
 * @param message - Human-readable error message
 * @param statusCode - HTTP status code
 * @param service - Service identifier
 * @returns A ToolResponse containing error information
 */
function createErrorResponse(
  requestId: string,
  code: MCPErrorCode,
  message: string,
  statusCode: number = 400,
  service: string = 'tools'
): ToolResponse<null> {
  return {
    success: false,
    error: {
      code,
      message,
      metadata: {
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

/**
 * Creates a success response for successful tool operations.
 * @param requestId - Unique identifier for the request
 * @param data - The result data from the tool operation
 * @returns A ToolResponse containing the successful result
 */
function createSuccessResponse<T>(
  requestId: string,
  data: T
): ToolResponse<T> {
  return {
    success: true,
    data,
    metadata: {
      requestId,
      processingTimeMs: 0,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Handles incoming tool requests.
 * @param event - The incoming request event
 * @returns A promise that resolves to a ToolResponse
 */
export async function handleToolRequest(event: any): Promise<ToolResponse> {
  const requestId = uuidv4();
  const path = event.path;
  const body = JSON.parse(event.body || '{}') as ToolRequest;
  
  // Extract tool type from path
  const toolType = path.split('/').pop();
  if (!toolType) {
    return createErrorResponse(
      requestId,
      MCPErrorCode.INVALID_REQUEST,
      'Invalid tool path'
    );
  }

  // Get tool from repository
  const tool = await toolRepository.getByName(toolType);
  if (!tool) {
    return createErrorResponse(
      requestId,
      MCPErrorCode.TOOL_NOT_FOUND,
      `No tool found for type: ${toolType}`,
      404
    );
  }

  try {
    // Handle the request using the tool's handler
    const response = await tool.handler.handle(body.parameters);
    
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
      MCPErrorCode.INTERNAL_ERROR,
      error instanceof Error ? error.message : 'Unknown error occurred',
      500
    );
  }
} 