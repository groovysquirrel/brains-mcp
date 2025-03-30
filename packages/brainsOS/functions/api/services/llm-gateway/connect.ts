import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from 'aws-lambda';
import { Logger } from '../../../../utils/logging/logger';
import { createResponse } from '../../../../utils/http/response';

const logger = new Logger('LLMGatewayConnect');

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event) => {
  const connectionId = (event.requestContext as any).connectionId;
  const userId = event.requestContext.authorizer?.iam?.userId;

  try {
    // Store connection info in DynamoDB or other storage if needed
    logger.info('New WebSocket connection established', {
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
    logger.error('Error in WebSocket connect handler:', {
      error,
      connectionId,
      userId
    });

    return createResponse(500, {
      success: false,
      error: {
        code: 'CONNECTION_ERROR',
        message: error.message || 'Failed to establish connection'
      },
      metadata: {
        connectionId,
        timestamp: new Date().toISOString()
      }
    });
  }
}; 