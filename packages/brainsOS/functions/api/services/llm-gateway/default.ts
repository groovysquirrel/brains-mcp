import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from 'aws-lambda';
import { Logger } from '../../../../utils/logging/logger';
import { createResponse } from '../../../../utils/http/response';

const logger = new Logger('LLMGatewayDefault');

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event) => {
  const connectionId = (event.requestContext as any).connectionId;
  const routeKey = (event.requestContext as any).routeKey;
  const userId = event.requestContext.authorizer?.iam?.userId;

  try {
    logger.warn('Unhandled WebSocket route', {
      connectionId,
      routeKey,
      userId
    });

    return createResponse(404, {
      success: false,
      error: {
        code: 'UNHANDLED_ROUTE',
        message: `Route ${routeKey} not found`
      },
      metadata: {
        connectionId,
        routeKey,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in WebSocket default handler:', {
      error,
      connectionId,
      routeKey,
      userId
    });

    return createResponse(500, {
      success: false,
      error: {
        code: 'DEFAULT_HANDLER_ERROR',
        message: error.message || 'Internal server error'
      },
      metadata: {
        connectionId,
        routeKey,
        timestamp: new Date().toISOString()
      }
    });
  }
}; 