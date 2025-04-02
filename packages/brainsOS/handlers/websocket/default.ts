import { APIGatewayProxyWebsocketEventV2 } from 'aws-lambda';
import { ApiGatewayManagementApi } from 'aws-sdk';

/**
 * Default handler for unmatched WebSocket routes
 */
export const handler = async (event: APIGatewayProxyWebsocketEventV2) => {
    try {
        const { domainName, stage, connectionId } = event.requestContext;
        const endpoint = `https://${domainName}/${stage}`;
        const gatewayApi = new ApiGatewayManagementApi({ endpoint });

        // Parse message if any
        const message = event.body ? JSON.parse(event.body) : {};

        // Send error message back to client
        await gatewayApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
                type: 'error',
                message: `Unhandled action type: ${message.action || 'undefined'}`,
                timestamp: new Date().toISOString()
            })
        }).promise();

        return {
            statusCode: 400,
            body: 'Unhandled route'
        };
    } catch (error) {
        console.error('Default handler error:', error);
        return {
            statusCode: 500,
            body: 'Internal server error'
        };
    }
}; 