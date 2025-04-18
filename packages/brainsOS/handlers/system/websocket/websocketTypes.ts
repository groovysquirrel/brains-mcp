// Define the structure of a WebSocket event
// This matches the format provided by AWS API Gateway WebSocket events
export interface WebSocketEvent {
    requestContext: {
      connectionId: string;  // Unique ID for this WebSocket connection
      authorizer?: {
        userId: string;     // User ID if authentication is enabled
      };
    };
    body?: string;          // The actual message content
  }