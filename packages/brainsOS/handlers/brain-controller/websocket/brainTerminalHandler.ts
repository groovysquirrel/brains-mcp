/**
 * WebSocket handler for brain controller operations.
 * This handler is responsible for:
 * 1. Managing WebSocket connections
 * 2. Processing brain controller requests
 * 3. Converting between terminal and brain message formats
 * 4. Handling errors and providing appropriate responses
 */

import { Logger } from '../../../utils/logging/logger';
import { ConnectionManager } from '../../system/websocket/connectionManager';
import { WebSocketEvent } from '../../system/websocket/websocketTypes';
import { BrainController } from '../../../modules/brain-controller/src/BrainController';
import { BrainMessage, BrainResponse, isBrainMessage } from './messagesTypes';
import { TerminalMessage, isTerminalMessage } from './messagesTypes';

// Initialize logging and connection management
const logger = new Logger('BrainControllerWebSocket');
const connectionManager = ConnectionManager.getInstance();
const brainController = BrainController.getInstance();

// Initialize the brain controller
brainController.initialize().catch(error => {
    logger.error('Failed to initialize brain controller:', error);
    throw error;
});

/**
 * Converts a terminal message to a brain message format
 * @param message - The terminal message to convert
 * @returns A brain message with default values
 */
const convertTerminalToBrainMessage = (message: TerminalMessage): BrainMessage => ({
    action: 'brain/chat',
    data: {
        rawData: message.data.rawData,
        requestStreaming: message.data.requestStreaming,
        commandId: message.data.commandId,
        timestamp: message.data.timestamp,
        source: 'terminal',
        brainName: 'default'  // Terminal messages always use default brain
    }
});

/**
 * Creates a default brain message from raw input
 * @param rawInput - The raw input to process
 * @returns A brain message with default values
 */
const createDefaultBrainMessage = (rawInput: string): BrainMessage => ({
    action: 'brain/chat',
    data: {
        rawData: rawInput,
        requestStreaming: false,
        commandId: `cmd_${Date.now()}`,
        timestamp: new Date().toISOString(),
        source: 'terminal',
        brainName: 'default'
    }
});

/**
 * Converts a brain response to a terminal response format
 * @param response - The brain response to convert
 * @param commandId - The command ID to include in the response
 * @returns A terminal response
 */
const convertBrainToTerminalResponse = (response: BrainResponse, commandId: string) => ({
    type: response.type,
    data: {
        content: response.data.content || '',
        source: response.data.source || 'system',
        timestamp: response.data.timestamp || new Date().toISOString(),
        commandId
    }
});

/**
 * Processes an incoming WebSocket event
 * @param event - The WebSocket event to process
 * @returns A response indicating success or failure
 */
export const handler = async (event: WebSocketEvent) => {
    const { connectionId } = event.requestContext;
    const userId = event.requestContext.authorizer?.userId;

    try {
        logger.info('Processing brain controller request', { connectionId, userId });

        // Parse and validate the incoming message
        const request = await parseIncomingMessage(event.body);
        
        // Add the connection to active connections
        connectionManager.addConnection(connectionId);

        // Process the request through the brain controller
        const response = await brainController.processRequest({
            action: request.action,
            data: {
                connectionId,
                userId, // Pass userId from auth context
                brainName: request.data.brainName,
                conversationId: request.data.conversationId,
                messages: [{
                    role: 'user',
                    content: request.data.rawData
                }]
            }
        });

        // Handle processing status response
        if (response.type === 'processing') {
            return { statusCode: 200, body: 'Processing started' };
        }

        // Convert and send the response
        const terminalResponse = convertBrainToTerminalResponse(response, request.data.commandId);
        await connectionManager.sendMessage(connectionId, terminalResponse);

        return { statusCode: 200, body: 'Message processed' };
    } catch (error) {
        logger.error('Brain controller handler error:', error);
        
        // Send error message to client
        await connectionManager.sendMessage(connectionId, {
            type: 'error',
            data: {
                source: 'system',
                content: error instanceof Error ? error.message : 'An unexpected error occurred',
                timestamp: new Date().toISOString()
            }
        });

        return { statusCode: 500, body: 'Internal server error' };
    }
};

/**
 * Parses and validates the incoming message
 * @param body - The raw message body
 * @returns A validated brain message
 */
async function parseIncomingMessage(body: string | null): Promise<BrainMessage> {
    if (!body) {
        return createDefaultBrainMessage('');
    }

    try {
        const parsedBody = JSON.parse(body);
        
        if (isBrainMessage(parsedBody)) {
            return parsedBody;
        }
        
        if (isTerminalMessage(parsedBody)) {
            return convertTerminalToBrainMessage(parsedBody);
        }
        
        // If it's JSON but not a recognized message type
        return createDefaultBrainMessage(body);
    } catch (e) {
        // If parsing fails, treat as plain text input
        return createDefaultBrainMessage(body);
    }
} 