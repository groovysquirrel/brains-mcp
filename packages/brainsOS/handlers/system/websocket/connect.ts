import { APIGatewayProxyWebsocketEventV2WithRequestContext } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { ConnectionManager } from './connectionManager';

const logger = new Logger('Websocket Connect');
const connectionManager = ConnectionManager.getInstance();

// Define custom request context type with authorizer
interface CustomRequestContext {
  connectionId: string;
  routeKey: string;
  messageId: string;
  eventType: string;
  extendedRequestId: string;
  requestTime: string;
  messageDirection: string;
  stage: string;
  connectedAt: number;
  requestTimeEpoch: number;
  identity: {
    sourceIp: string;
  };
  requestId: string;
  domainName: string;
  apiId: string;
  authorizer?: {
    principalId: string;
    integrationLatency: number;
    userId: string;
    email: string;
  };
}

export const handler = async (event: APIGatewayProxyWebsocketEventV2WithRequestContext<CustomRequestContext>) => {
  const connectionId = event.requestContext.connectionId;
  // Get the user ID and email from the authorizer response
  const userId = event.requestContext.authorizer?.userId;
  const email = event.requestContext.authorizer?.email;

  try {
    // Store connection in DynamoDB using ConnectionManager
    await connectionManager.addConnection(connectionId, userId);
    
    logger.info('New WebSocket connection established and stored', {
      connectionId,
      userId,
      email
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        metadata: {
          connectionId,
          userId,
          email,
          timestamp: new Date().toISOString()
        }
      })
    };
  } catch (error) {
    logger.error('Error in WebSocket connect handler:', {
      error: error instanceof Error ? error.message : String(error),
      connectionId,
      userId,
      email
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'CONNECTION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to establish connection'
        },
        metadata: {
          connectionId,
          userId,
          email,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
}; 