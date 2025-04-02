import { APIGatewayProxyWebsocketEventV2WithRequestContext } from 'aws-lambda';

// Define custom request context type with authorizer
export interface CustomRequestContext {
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

// Custom type for our authorizer context
export interface CustomAuthorizerContext {
  context: {
    userId: string;
  };
}

// Type for WebSocket events with our custom context
export type WebSocketEvent = APIGatewayProxyWebsocketEventV2WithRequestContext<CustomRequestContext>;
