import { ApiGatewayManagementApi } from 'aws-sdk';
import { LLMGateway } from '../../../system/services/llm-gateway/llmGateway';
import { ChatRequest, ModelConfig } from '../../../system/services/llm-gateway/types';
import { HumanMessage } from "@langchain/core/messages";
import { WebSocketEvent } from '../types/websocketTypes';

/**
 * Handler for llm/stream WebSocket route
 * Manages streaming responses from LLM
 */
export const handler = async (event: WebSocketEvent) => {
    // Get the user ID from the authorizer response
    const userId = event.requestContext.authorizer?.userId;

    try {
        // Parse message
        const body = JSON.parse(event.body || '{}');
        
        // Validate message format
        if (!body.prompt || !body.modelId) {
            throw new Error('Invalid message format. Expected {prompt: string, modelId: string}');
        }

        // Initialize LLM Gateway with Bedrock config
        // Using IAM credentials from Lambda execution role
        const llmGateway = new LLMGateway({
            bedrock: {}
        });

        // Setup WebSocket connection for streaming
        const { domainName, stage, connectionId } = event.requestContext;
        const endpoint = `https://${domainName}/${stage}`;
        const gatewayApi = new ApiGatewayManagementApi({ endpoint });

        // Prepare the chat request
        const modelConfig: ModelConfig = {
            provider: 'bedrock',
            modelId: body.modelId,
            maxTokens: 4000,
            temperature: 0.7
        };

        const chatRequest: ChatRequest = {
            messages: [new HumanMessage(body.prompt)],
            modelConfig,
            systemPrompt: body.systemPrompt,
            metadata: {
                userId,
                connectionId,
                timestamp: new Date().toISOString()
            }
        };

        // Stream the response
        const stream = llmGateway.streamChat(chatRequest);
        
        // Process the stream and send chunks to the client
        for await (const chunk of stream) {
            await gatewayApi.postToConnection({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                    type: 'stream',
                    content: chunk.content,
                    usage: chunk.usage,
                    metadata: chunk.metadata,
                    timestamp: new Date().toISOString()
                })
            }).promise();
        }

        // Send completion message
        await gatewayApi.postToConnection({
            ConnectionId: connectionId,
            Data: JSON.stringify({
                type: 'stream_complete',
                timestamp: new Date().toISOString()
            })
        }).promise();

        return {
            statusCode: 200,
            body: 'Stream completed'
        };

    } catch (error) {
        console.error('Stream handler error:', error);
        
        // Try to send error message back to client
        try {
            const { domainName, stage, connectionId } = event.requestContext;
            const endpoint = `https://${domainName}/${stage}`;
            const gatewayApi = new ApiGatewayManagementApi({ endpoint });

            await gatewayApi.postToConnection({
                ConnectionId: connectionId,
                Data: JSON.stringify({
                    type: 'error',
                    message: error.message || 'Error processing stream request',
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