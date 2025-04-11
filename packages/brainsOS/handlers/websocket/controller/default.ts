import { ConnectionManager } from '../util/connectionManager';
import { Logger } from '../../shared/logging/logger';
import { LLMChatMessageHandler } from '../llm-gateway/chat';
import { WebSocketEvent } from '../websocketTypes';
import { TerminalMessage, isTerminalMessage, TerminalResponse } from './messagesTypes';

const logger = new Logger('Websocket Default');

// Track conversation IDs per connection
const conversationMap = new Map<string, string>();

/**
 * Default handler for unmatched WebSocket routes
 */
export const handler = async (event: WebSocketEvent) => {
    try {
        const { connectionId } = event.requestContext;
        const connectionManager = ConnectionManager.getInstance();
        const chatHandler = new LLMChatMessageHandler();

        logger.info('Processing default route message', { connectionId });

        // Parse the incoming message
        let rawInput: string;
        if (event.body) {
            try {
                const parsedBody = JSON.parse(event.body);
                if (isTerminalMessage(parsedBody)) {
                    // If it's a valid terminal message, use the rawData
                    rawInput = parsedBody.data.rawData;
                } else {
                    // If it's JSON but not a terminal message, try to extract content
                    rawInput = parsedBody.prompt || parsedBody.content || parsedBody.message || event.body;
                }
            } catch (e) {
                // If parsing fails, treat it as plain text input
                rawInput = event.body;
                console.log('Failed to parse JSON, treating as plain text:', event.body);
            }
        } else {
            rawInput = '';
        }
        
        // Add the connection to the active connections
        connectionManager.addConnection(connectionId);

        // Get or create conversation ID for this connection
        let conversationId = conversationMap.get(connectionId);
        if (!conversationId) {
            // Generate a new conversation ID for new connections
            conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            conversationMap.set(connectionId, conversationId);
            logger.info('Created new conversation', { connectionId, conversationId });
        }

        // Format the message for the LLM gateway
        const llmRequest = {
            action: 'llm/chat',
            data: {
                provider: 'bedrock',
                modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
                streaming: false,
                conversationId,
                messages: [{
                    role: 'user',
                    content: rawInput.trim() || 'Hello'
                }]
            }
        };

        // Forward the message to the chat handler
        const response = await chatHandler.handleMessage(
            llmRequest,
            connectionId,
            event.requestContext.authorizer?.userId
        );

        // If the response is a processing status, return immediately
        if (response.type === 'processing') {
            return {
                statusCode: 200,
                body: 'Processing started'
            };
        }

        // Convert chat response to terminal response format
        const terminalResponse: TerminalResponse = {
            type: 'terminal',
            data: {
                content: response.data.content,
                source: response.data.metadata?.model || 'unknown-model',
                timestamp: new Date().toISOString(),
                commandId: response.data.commandId
            }
        };

        // Send the response back to client
        await connectionManager.sendMessage(connectionId, terminalResponse);

        return {
            statusCode: 200,
            body: 'Message processed'
        };
    } catch (error) {
        logger.error('Default handler error:', error);
        
        // Send error message to client with system as source
        await ConnectionManager.getInstance().sendMessage(event.requestContext.connectionId, {
            type: 'error',
            data: {
                source: 'system',
                content: error instanceof Error ? error.message : 'An unexpected error occurred',
                timestamp: new Date().toISOString()
            }
        });

        return {
            statusCode: 500,
            body: 'Internal server error'
        };
    }
}; 