import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { createResponse } from '../../../utils/http/response';
import { ConnectionManager } from './connectionManager';

const logger = new Logger('WebsocketDisconnect');
const connectionManager = ConnectionManager.getInstance();

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event) => {
  const connectionId = (event.requestContext as any).connectionId;
  const userId = event.requestContext.authorizer?.iam?.userId;

  try {
    // Clean up stored connection in DynamoDB
    await connectionManager.removeConnection(connectionId);
    
    logger.info('WebSocket connection closed and removed from database', {
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
      error: error instanceof Error ? error.message : String(error),
      connectionId,
      userId
    });

    return createResponse(500, {
      success: false,
      error: {
        code: 'DISCONNECT_ERROR',
        message: error instanceof Error ? error.message : 'Failed to close connection'
      },
      metadata: {
        connectionId,
        timestamp: new Date().toISOString()
      }
    });
  }
}; 