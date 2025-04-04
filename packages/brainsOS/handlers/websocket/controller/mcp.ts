import { ApiGatewayManagementApi } from 'aws-sdk';
import { ModelController } from '../../../controller/ModelController';
import { LLMGateway } from '../../../llm-gateway/llmGateway';
import { conversationRepository } from '../../../system/repositories/conversation/conversationRepository';
import { WebSocketEvent } from '../types/websocketTypes';

/**
 * Handler for controller/mcp WebSocket route
 * Processes MCP commands through the ModelController
 */
export const handler = async (event: WebSocketEvent) => {
    try {
        // Parse message
        const body = JSON.parse(event.body || '{}');
        
        // Validate message format
        if (!body.command) {
            throw new Error('Invalid message format. Expected {command: MCPCommand}');
        }

        // Initialize controller
        const llmGateway = new LLMGateway({
            bedrock: {}
        });
        const controller = new ModelController(llmGateway, conversationRepository);

        // Process MCP command
        const response = await controller.processMessage(
            event.requestContext.connectionId,
            body.command
        );

        // Send response back through WebSocket
        const { domainName, stage, connectionId } = event.requestContext;
        const endpoint = `https://${domainName}/${stage}`;
        const gatewayApi = new ApiGatewayManagementApi({ endpoint });

        await gatewayApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
                type: 'mcp_response',
                result: response,
                timestamp: new Date().toISOString()
            })
        }).promise();

        return {
            statusCode: 200,
            body: 'MCP command processed'
        };

    } catch (error) {
        console.error('Controller MCP handler error:', error);
        
        // Try to send error message back to client
        try {
            const { domainName, stage, connectionId } = event.requestContext;
            const endpoint = `https://${domainName}/${stage}`;
            const gatewayApi = new ApiGatewayManagementApi({ endpoint });

            await gatewayApi.postToConnection({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                    type: 'error',
                    message: error.message || 'Error processing MCP command',
                    timestamp: new Date().toISOString()
                })
            }).promise();
        } catch (sendError) {
            console.error('Failed to send error message:', sendError);
        }

        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'Internal server error',
                error: error.message
            })
        };
    }
}; 