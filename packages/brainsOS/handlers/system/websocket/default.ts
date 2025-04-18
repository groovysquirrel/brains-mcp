import { WebSocketEvent } from "./websocketTypes";

export const handler = async (event: WebSocketEvent) => {
    const connectionId = event.requestContext.connectionId;
    const userId = event.requestContext.authorizer?.userId;
  
  
    return { statusCode: 500, body: "Unstructured messages not supported."};
};
