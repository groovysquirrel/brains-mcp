/**
 * WebSocket handler for brain controller operations.
 * This handler is responsible for:
 * 1. Managing WebSocket connections
 * 2. Processing brain controller requests
 * 3. Converting between terminal and brain message formats
 * 4. Handling errors and providing appropriate responses
 */

import { Logger } from '../../../shared/Logger';
import { ConnectionManager } from '../../system/websocket/connectionManager';
import { WebSocketEvent } from '../../system/websocket/websocketTypes';
import { BrainController } from '../../../modules/brain-controller/src/BrainController';
import { BrainMessage, BrainResponse, isBrainMessage } from './messagesTypes';
import { TerminalMessage, isTerminalMessage } from './messagesTypes';

// Initialize logging and connection management
const logger = new Logger('Brain.WebSocketHandler', 'info');
const connectionManager = ConnectionManager.getInstance();
const brainController = BrainController.getInstance({
    connectionManager: connectionManager
});

// Initialize the brain controller - this is executed at module load time
// but we'll also ensure initialization in the handler
let initializationPromise = brainController.initialize().catch(error => {
    logger.error('Failed to initialize brain controller during module load:', error);
    // Don't throw here, we'll retry in the handler
});

/**
 * Converts a terminal message to a brain message format
 * @param message - The terminal message to convert
 * @returns A brain message with default values
 */
const convertTerminalToBrainMessage = (message: TerminalMessage): BrainMessage => ({
    action: 'brain/terminal/request',
    data: {
        rawData: message.data.rawData,
        requestStreaming: message.data.requestStreaming,
        commandId: message.data.commandId,
        timestamp: message.data.timestamp,
        source: 'terminal',
        brainName: 'default',  // Terminal messages always use default brain
        conversationId: message.data.conversationId  // Preserve conversationId if it exists
    }
});

/**
 * Creates a default brain message from raw input
 * @param rawInput - The raw text input (optional)
 * @returns A properly formatted brain message
 */
const createDefaultBrainMessage = (rawInput?: string): BrainMessage => {
    const message: BrainMessage = {
        action: 'brain/terminal/request',
        data: {
            requestStreaming: false,
            timestamp: new Date().toISOString(),
            source: 'terminal'
        }
    } as BrainMessage;

    // Add rawData if provided
    if (rawInput !== undefined) {
        message.data.rawData = rawInput;
    }

    return message;
};

/**
 * Converts a brain response to a terminal response format
 * @param response - The brain response to convert
 * @param commandId - The command ID to include in the response
 * @returns A terminal response
 */
const convertBrainToTerminalResponse = (response: BrainResponse, commandId: string) => {
    // Map the response type to action
    const responseAction = mapResponseType(response.type);
    
    // Use the original commandId, don't modify it
    return {
        action: responseAction,
        data: {
            content: response.data.content || '',
            source: response.data.source || 'system',
            timestamp: response.data.timestamp || new Date().toISOString(),
            commandId,
            conversationId: response.data.conversationId,
            status: response.data.status,
            metadata: response.data.metadata
        }
    };
};

/**
 * Maps new response types to legacy types for backward compatibility if needed
 * @param type The response type to map
 * @returns The mapped response type
 */
const mapResponseType = (type: string): string => {
    // For now, we'll return the new type directly
    // In the future, if needed, we could map back to legacy types
    return type;
};

/**
 * Processes an incoming WebSocket event
 * @param event - The WebSocket event to process
 * @returns A response indicating success or failure
 */
export const handler = async (event: WebSocketEvent) => {
    const { connectionId } = event.requestContext;
    const userId = event.requestContext.authorizer?.userId;

    try {
        logger.info('Processing brain controller request', { 
            connectionId, 
            userId,
            body: event.body 
        });

        // Parse and validate the incoming message
        const request = await parseIncomingMessage(event.body);
        logger.info('Parsed request', { 
            action: request.action,
            rawData: request.data.rawData,
            commandId: request.data.commandId,
            brainName: request.data.brainName || 'default'
        });
        
        // Add the connection to active connections
        connectionManager.addConnection(connectionId);

        // Ensure brain controller is initialized before proceeding
        try {
            // First, wait for any existing initialization to complete
            await initializationPromise;
            
            // Then explicitly ensure initialization
            await brainController.ensureInitialized();
            
            logger.info('BrainController is properly initialized');
        } catch (initError) {
            logger.error('Failed to initialize BrainController, retrying once:', initError);
            
            // Retry initialization once
            try {
                initializationPromise = brainController.initialize();
                await initializationPromise;
                logger.info('BrainController initialized successfully on retry');
            } catch (retryError) {
                logger.error('Failed to initialize BrainController even after retry:', retryError);
                throw new Error('Failed to initialize BrainController: ' + 
                    (retryError instanceof Error ? retryError.message : String(retryError)));
            }
        }

        logger.info('Creating request for brain controller', {
            action: request.action,
            connectionId,
            userId,
            brainName: request.data.brainName,
            commandId: request.data.commandId,
        });

        // Process the request through the brain controller
        const brainRequest = {
            action: request.action,
            data: {
                connectionId,
                userId, // Pass userId from auth context
                brainName: request.data.brainName || 'default',
                conversationId: request.data.conversationId,
                commandId: request.data.commandId,
                messages: request.data.messages || (request.data.rawData ? [{
                    role: 'user',
                    content: request.data.rawData
                }] : [])
            }
        };

        logger.debug('Constructed brainRequest object', { brainRequest });

        logger.info('Sending data to brainController.processRequest', { data: brainRequest.data });

        const response = await brainController.processRequest(brainRequest);
        
        logger.info('Received response from brain controller', { 
            responseType: response.type,
            hasContent: !!response.data.content,
            contentLength: response.data.content ? response.data.content.length : 0
        });

        // Handle status response
        if (response.type === 'brain/terminal/status') {
            logger.info('Processing status response, returning 200');
            
            // Also send the status to the client
            const statusResponse = convertBrainToTerminalResponse(response, request.data.commandId);
            await connectionManager.sendMessage(connectionId, statusResponse);
            
            return { statusCode: 200, body: 'Processing started' };
        }

        // Convert and send the response
        const terminalResponse = convertBrainToTerminalResponse(response, request.data.commandId);
        logger.info('Sending message to client', {
            responseType: terminalResponse.action,
            connectionId,
            hasContent: !!terminalResponse.data.content,
            contentPreview: terminalResponse.data.content ? terminalResponse.data.content.substring(0, 50) + '...' : ''
        });
        
        await connectionManager.sendMessage(connectionId, terminalResponse);

        return { statusCode: 200, body: 'Message processed' };
    } catch (error) {
        logger.error('Brain controller handler error:', {
            error,
            message: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            connectionId,
            userId
        });
        
        // Send error message to client
        await connectionManager.sendMessage(connectionId, {
            action: 'brain/terminal/error',
            data: {
                source: 'system',
                content: error instanceof Error ? error.message : 'An unexpected error occurred',
                timestamp: new Date().toISOString(),
                commandId: 'error_' + Date.now()
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
        logger.warn('Received empty message body, creating default brain message');
        return createDefaultBrainMessage('');
    }

    try {
        logger.info('Parsing incoming message', { body });
        const parsedBody = JSON.parse(body);
        logger.info('Successfully parsed JSON', { parsedBody });

        // Check the structure *after* parsing 
        if (parsedBody.action === 'brain/terminal/request' && typeof parsedBody.data === 'object' && parsedBody.data !== null) {
            logger.info('Identified brain/terminal/request structure');
            
            const messageData = parsedBody.data;
            // --- Corrected Construction of BrainMessage --- 
            const brainMessage: BrainMessage = {action: parsedBody.action, data: {rawData: typeof messageData.rawData === 'string' ? messageData.rawData : '', requestStreaming: typeof messageData.requestStreaming === 'boolean' ? messageData.requestStreaming : false, commandId: typeof messageData.commandId === 'string' ? messageData.commandId : undefined, timestamp: typeof messageData.timestamp === 'string' ? messageData.timestamp : new Date().toISOString(), source: typeof messageData.source === 'string' ? messageData.source : 'terminal', brainName: typeof messageData.brainName === 'string' ? messageData.brainName : 'default', conversationId: typeof messageData.conversationId === 'string' ? messageData.conversationId : undefined, messages: Array.isArray(messageData.messages) ? messageData.messages : undefined}};
            return brainMessage;
        }

        // If it doesn't match the expected structure, log warning and treat as raw.
        logger.warn('Unknown message format after JSON parse, treating body as raw input', { parsedBody });
        return createDefaultBrainMessage(body);

    } catch (e) {
        // If JSON parsing fails entirely, treat the original body as raw input
        logger.info('Failed to parse message as JSON, treating original body as raw input', { error: e instanceof Error ? e.message : String(e) });
        return createDefaultBrainMessage(body);
    }
} 