import { APIGatewayProxyHandlerV2WithIAMAuthorizer, APIGatewayProxyResultV2, Callback } from 'aws-lambda';
import { PromptServiceError, ErrorCodes } from './promptHandlerErrors';
import { instructionHandler } from './instruction/instructionHandler';
import { conversationHandler } from './conversation/conversationHandler';
import { Logger } from '../../../../utils/logging/logger';
import { createResponse } from '../../../../utils/http/response';

const logger = new Logger('PromptHandler');

// Temporary until system repository integration
const DEFAULT_SYSTEM_PROMPT = /* @systemRepository.getSettings() */ "You are a helpful AI assistant. Please provide accurate and relevant responses.";

const SUPPORTED_PROMPT_TYPES = ['instruction', 'conversation', 'chat'] as const;
type PromptType = typeof SUPPORTED_PROMPT_TYPES[number];

class BedrockServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'BedrockServiceError';
  }
}

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (
  event,
  context,
  callback
): Promise<APIGatewayProxyResultV2> => {
  const requestId = event.requestContext.requestId;
  const startTime = Date.now();
  
  try {
    // Enhanced debug logging
    logger.info(`[${requestId}] Request details:`, {
      method: event.requestContext.http.method,
      path: event.rawPath,
      pathParameters: event.pathParameters,
      queryStringParameters: event.queryStringParameters,
      headers: event.headers,
      body: event.body ? JSON.parse(event.body) : null,
      authorizer: event.requestContext.authorizer,
      requestContext: event.requestContext
    });

    // Verify user authorization
    const userId = event.requestContext.authorizer?.iam?.userId;
    logger.info(`[${requestId}] Auth check:`, { userId, authorizer: event.requestContext.authorizer });
    
    if (!userId) {
      logger.error(`[${requestId}] Missing userId in request context`, {
        authorizer: event.requestContext.authorizer
      });
      return createResponse(401, {
        success: false,
        error: {
          code: 'UNAUTHORIZED',
          message: 'Unauthorized - missing user context',
          details: {
            code: 'UNAUTHORIZED',
            service: 'prompt',
            statusCode: 401
          }
        },
        metadata: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Validate prompt type
    const promptType = event.pathParameters?.promptType?.toLowerCase();
    logger.info(`[${requestId}] Prompt type validation:`, { 
      promptType,
      supported: SUPPORTED_PROMPT_TYPES,
      isValid: promptType && SUPPORTED_PROMPT_TYPES.includes(promptType as PromptType)
    });

    // Validate payload
    if (!event.body) {
      throw new PromptServiceError('Missing request body', {
        code: ErrorCodes.MISSING_PAYLOAD,
        service: 'prompt',
        statusCode: 400
      });
    }

    const payload = JSON.parse(event.body);
    if (!payload.userPrompt || !payload.modelId || !payload.modelSource) {
      throw new PromptServiceError('Invalid request payload', {
        code: ErrorCodes.MISSING_PAYLOAD,
        service: 'prompt',
        statusCode: 400
      });
    }

    // Update the response handling to ensure we always return APIGatewayProxyResultV2
    const response: APIGatewayProxyResultV2 = await (async (): Promise<APIGatewayProxyResultV2> => {
      switch(promptType) {
        case 'instruction':
          if (event.requestContext.http.method === 'GET') {
            return createResponse(200, {
              success: true,
              data: {
                supportedModels: ['anthropic.claude-v2', 'anthropic.claude-instant-v1'],
                documentation: {/* ... */}
              },
              metadata: {
                requestId,
                processingTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString()
              }
            });
          }
          logger.info(`[${requestId}] Routing to instruction handler`);
          const instructionResponse = await instructionHandler(event, context, callback);
          if (!instructionResponse) {
            throw new PromptServiceError('No response from instruction handler', {
              code: ErrorCodes.INVOCATION_ERROR,
              service: 'prompt',
              statusCode: 500
            });
          }
          return instructionResponse;
          
        case 'conversation':
        case 'chat':
          logger.info(`[${requestId}] Routing to conversation handler`);
          const conversationResponse = await conversationHandler(event, context, callback);
          if (!conversationResponse) {
            throw new PromptServiceError('No response from conversation handler', {
              code: ErrorCodes.INVOCATION_ERROR,
              service: 'prompt',
              statusCode: 500
            });
          }
          return conversationResponse;
          
        default:
          throw new PromptServiceError('Unsupported prompt type', {
            code: ErrorCodes.INVALID_PROMPT_TYPE,
            service: 'prompt',
            statusCode: 400
          });
      }
    })();

    logger.info(`[${requestId}] Returning response:`, response);
    return response;

  } catch (error) {
    logger.error(`[${requestId}] Error processing prompt request:`, {
      error,
      stack: error.stack,
      details: error instanceof PromptServiceError ? error.details : undefined
    });

    // Let the error responses from the handlers pass through
    if (error instanceof PromptServiceError) {
      return createResponse(error.details.statusCode, {
        success: false,
        error: {
          code: error.details.code,
          message: error.message,
          details: error.details
        },
        metadata: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Handle unexpected errors
    return createResponse(500, {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: error instanceof Error ? error.message : 'An unexpected error occurred',
        details: {
          code: 'INTERNAL_ERROR',
          service: 'prompt',
          statusCode: 500,
          message: error instanceof Error ? error.message : 'Unknown error'
        }
      },
      metadata: {
        requestId,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    });
  }
};
