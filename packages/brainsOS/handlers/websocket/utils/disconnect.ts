import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { createResponse } from '../../../utils/http/response';

const logger = new Logger('LLMGatewayDisconnect');

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event) => {
  const connectionId = (event.requestContext as any).connectionId;
  const userId = event.requestContext.authorizer?.iam?.userId;

  try {
    // Clean up any stored connection info
    logger.info('WebSocket connection closed', {
      connectionId,
      userId
    });

    return createResponse(200, {
      success: true,
      metadata: {
        connectionId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    logger.error('Error in WebSocket disconnect handler:', {
      error,
      connectionId,
      userId
    });

    return createResponse(500, {
      success: false,
      error: {
        code: 'DISCONNECT_ERROR',
        message: error.message || 'Failed to close connection'
      },
      metadata: {
        connectionId,
        timestamp: new Date().toISOString()
      }
    });
  }
}; 