import { MCPPrompt, MCPResponse } from '../mcpTypes';
import { promptRegistry } from './mcpPromptIndex';
import { v4 as uuidv4 } from 'uuid';

// Common response helpers
function createErrorResponse(
  requestId: string,
  code: string,
  message: string,
  statusCode: number = 400,
  service: string = 'prompts'
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

export async function promptsHandler(event: any): Promise<MCPResponse> {
  const requestId = uuidv4();
  const path = event.path;
  const body = JSON.parse(event.body || '{}') as MCPPrompt;
  
  // Extract prompt type from path
  const promptType = path.split('/').pop();
  if (!promptType) {
    return createErrorResponse(
      requestId,
      'INVALID_PATH',
      'Invalid prompt path'
    );
  }

  // Get prompt from registry
  const prompt = promptRegistry.getPrompt(promptType);
  if (!prompt) {
    return createErrorResponse(
      requestId,
      'PROMPT_NOT_FOUND',
      `No prompt found for type: ${promptType}`,
      404
    );
  }

  try {
    // Handle the request using the prompt's handler
    const response = await prompt.handler.handle(body);
    
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