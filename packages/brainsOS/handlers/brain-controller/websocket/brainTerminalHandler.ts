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
        brainName: 'default'  // Terminal messages always use default brain
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
            commandId: `cmd_${Date.now()}`,
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
    
    return {
        action: responseAction,
        data: {
            content: response.data.content || '',
            source: response.data.source || 'system',
            timestamp: response.data.timestamp || new Date().toISOString(),
            commandId,
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
            brainName: request.data.brainName
        });

        // Process the request through the brain controller
        const brainRequest = {
            action: request.action,
            data: {
                connectionId,
                userId, // Pass userId from auth context
                brainName: request.data.brainName || 'default',
                conversationId: request.data.conversationId,
                // Check if messages are provided directly first, then fall back to constructing from rawData
                messages: request.data.messages || (request.data.rawData ? [{
                    role: 'user',
                    content: request.data.rawData
                }] : [])
            }
        };

        logger.info('Sending request to brain controller', { 
            request: JSON.stringify({
                ...brainRequest,
                data: {
                    ...brainRequest.data,
                    messages: brainRequest.data.messages.length > 0 ? 
                        [{...brainRequest.data.messages[0], content: brainRequest.data.messages[0]?.content?.substring(0, 50) + '...'}] : 
                        []
                }
            }),
            messageCount: brainRequest.data.messages.length,
            hasRawData: !!request.data.rawData,
            hasMessages: !!request.data.messages
        });

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
        logger.error('Brain controller handler error:', error instanceof Error ? error.message : String(error), {
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
        logger.warn('Received empty message body');
        return createDefaultBrainMessage('');
    }

    try {
        logger.info('Parsing incoming message', { body });
        const parsedBody = JSON.parse(body);
        logger.info('Parsed JSON message', { 
            action: parsedBody.action,
            hasData: !!parsedBody.data,
            dataKeys: parsedBody.data ? Object.keys(parsedBody.data) : [],
            hasMessages: Array.isArray(parsedBody.data?.messages),
            hasRawData: typeof parsedBody.data?.rawData === 'string'
        });
        
        if (isBrainMessage(parsedBody)) {
            logger.info('Message is valid BrainMessage');
            
            // Ensure rawData exists if not provided but messages are
            if (!parsedBody.data.rawData && Array.isArray(parsedBody.data.messages) && parsedBody.data.messages.length > 0) {
                logger.info('Message has messages but no rawData, keeping as is');
            }
            
            return parsedBody;
        }
        
        // If the message has 'action' set to 'terminal', convert it to 'brain/terminal/request'
        if (parsedBody.action === 'terminal' && typeof parsedBody.data === 'object') {
            logger.info('Converting terminal action to brain/terminal/request');
            return {
                action: 'brain/terminal/request',
                data: {
                    ...parsedBody.data,
                    source: parsedBody.data.source || 'terminal',
                    brainName: parsedBody.data.brainName || 'default'
                }
            };
        }
        
        // Handle legacy 'brain/terminal' action
        if (parsedBody.action === 'brain/terminal' && typeof parsedBody.data === 'object') {
            logger.info('Converting legacy brain/terminal action to brain/terminal/request');
            return {
                action: 'brain/terminal/request',
                data: {
                    ...parsedBody.data,
                    source: parsedBody.data.source || 'terminal',
                    brainName: parsedBody.data.brainName || 'default'
                }
            };
        }
        
        if (isTerminalMessage(parsedBody)) {
            logger.info('Message is valid TerminalMessage, converting to BrainMessage');
            return convertTerminalToBrainMessage(parsedBody);
        }
        
        // If it's JSON but not a recognized message type
        logger.info('Unknown message format, treating as raw input', { body: JSON.stringify(parsedBody) });
        return createDefaultBrainMessage(body);
    } catch (e) {
        // If parsing fails, treat as plain text input
        logger.info('Failed to parse message as JSON, treating as raw input', { error: e instanceof Error ? e.message : String(e) });
        return createDefaultBrainMessage(body);
    }
} 