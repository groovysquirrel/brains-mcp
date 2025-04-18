/**
 * WebSocket handler for direct MCP response handling.
 * This handler processes 'brain/mcp/response' WebSocket actions.
 * These are typically used for direct command results from the MCP server.
 */

import { Logger } from '../../../utils/logging/logger';
import { ConnectionManager } from '../../system/websocket/connectionManager';
import { WebSocketEvent } from '../../system/websocket/websocketTypes';
import { BrainController } from '../../../modules/brain-controller/src/BrainController';

// Initialize logging and connection management
const logger = new Logger('BrainMcpResultHandler');
const connectionManager = ConnectionManager.getInstance();
const brainController = BrainController.getInstance();

// Initialize the brain controller - this is executed at module load time
// but we'll also ensure initialization in the handler
let initializationPromise = brainController.initialize().catch(error => {
    logger.error('Failed to initialize brain controller during module load:', error);
    // Don't throw here, we'll retry in the handler
});

/**
 * Process an incoming WebSocket MCP response event
 */
export const handler = async (event: WebSocketEvent) => {
    const { connectionId } = event.requestContext;
    const userId = event.requestContext.authorizer?.userId;

    try {
        logger.info('Processing MCP response', { 
            connectionId, 
            userId,
            body: event.body 
        });

        // Ensure brain controller is initialized before proceeding
        try {
            // First, wait for any existing initialization to complete
            await initializationPromise;
            
            // Then explicitly ensure initialization
            await brainController.ensureInitialized();
            
            logger.info('BrainController is properly initialized for MCP response processing');
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

        // Parse the event body
        let body: any;
        try {
            body = event.body ? JSON.parse(event.body) : {};
        } catch (error) {
            logger.error('Failed to parse event body:', error);
            return { statusCode: 400, body: 'Invalid JSON in request body' };
        }

        // Log the MCP response details
        logger.info('Received MCP response payload', { 
            connectionId,
            action: body.action,
            requestId: body.data?.requestId,
            toolName: body.data?.toolName
        });

        // If tool results are available, log them
        if (body.data?.toolName) {
            if (body.data.success) {
                logger.info(`Tool execution successful: ${body.data.toolName}`, { 
                    result: body.data.result,
                    requestId: body.data.requestId
                });
            } else {
                logger.warn(`Tool execution failed: ${body.data.toolName}`, { 
                    error: body.data.error,
                    requestId: body.data.requestId
                });
            }
        }

        // Send status message for the received MCP response
        await connectionManager.sendMessage(connectionId, {
            action: 'brain/terminal/status/mcp',
            data: {
                requestId: body.data?.requestId,
                commandId: body.data?.commandId,
                status: 'received',
                message: `Received result from command "${body.data?.toolName}"`,
                timestamp: new Date().toISOString(),
                toolName: body.data?.toolName,
                result: body.data?.result,
                error: body.data?.error
            }
        });

        // For responses with a commandId and conversationId, we can optionally
        // process through the LLM
        const shouldProcessThroughLLM = !!body.data?.conversationId && 
            !!body.data?.commandId && 
            body.data?.success &&
            body.data?.processResult !== false; // Allow explicit opt-out

        logger.info('Evaluating if result should be processed through LLM', {
            hasConversationId: !!body.data?.conversationId,
            hasCommandId: !!body.data?.commandId,
            isSuccessful: !!body.data?.success,
            processResult: body.data?.processResult,
            shouldProcess: shouldProcessThroughLLM,
            conversationId: body.data?.conversationId,
            responseChannel: connectionId
        });
        
        if (shouldProcessThroughLLM) {
            try {
                // This is where we process the result through the LLM
                const conversationId = body.data.conversationId;
                const brainName = body.data.brainName || 'default';
                
                logger.info('Processing MCP result through LLM', {
                    conversationId,
                    commandId: body.data.commandId,
                    brainName,
                    result: body.data.result ? JSON.stringify(body.data.result).substring(0, 100) : null
                });
                
                // Make sure we have a valid brain controller
                if (!brainController) {
                    throw new Error('BrainController is not initialized');
                }
                
                // IMPORTANT: Register the conversation mapping explicitly to ensure continuity
                // This prevents BrainController from creating a new conversation for this connection
                logger.debug('Registering conversation mapping', {
                    connectionId,
                    conversationId,
                    before: await connectionManager.getConversationId(connectionId)
                });
                
                brainController.registerConversationMapping(connectionId, conversationId);
                
                // Format the MCP result for the LLM
                const resultSummary = formatMcpResultForLLM(body.data);
                logger.debug('Formatted MCP result for LLM', {
                    summary: resultSummary.substring(0, 100) + (resultSummary.length > 100 ? '...' : ''),
                    length: resultSummary.length
                });
                
                // Create a request for the BrainController
                const request = {
                    action: 'brain/terminal/request' as const,
                    data: {
                        connectionId,
                        userId,
                        conversationId,
                        commandId: `result_${body.data.commandId || body.data.requestId}`,
                        // Important: Use messages array instead of rawData to maintain conversation context
                        messages: [{
                            role: 'user',
                            content: `Process these command results: ${resultSummary}`
                        }],
                        rawData: null, // Set explicitly to null to ensure messages is used
                        requestStreaming: false,
                        timestamp: new Date().toISOString(),
                        source: 'terminal',
                        brainName
                    }
                };
                
                logger.info('Sending command result to BrainController', {
                    conversationId,
                    connectionId,
                    brainName,
                    messageLength: resultSummary.length,
                    requestAction: request.action,
                    requestDataKeys: Object.keys(request.data)
                });
                
                // Send the request to the BrainController
                try {
                    const response = await brainController.processRequest(request);
                    
                    logger.info('Successfully processed MCP result through LLM', {
                        responseType: response.type,
                        responseDataKeys: Object.keys(response.data),
                        contentLength: response.data.content ? response.data.content.length : 0,
                        conversationId,
                        brainName
                    });
                    
                    // SEND THE RESPONSE BACK TO THE CLIENT
                    if (response) {
                        // Create a proper terminal response message format
                        const terminalResponse = {
                            action: response.type,
                            data: {
                                ...response.data,
                                commandId: `result_${body.data.commandId || body.data.requestId}`,
                                timestamp: new Date().toISOString()
                            }
                        };
                        
                        logger.info('Sending final LLM response to client', {
                            connectionId,
                            responseType: response.type,
                            contentLength: response.data.content ? response.data.content.length : 0
                        });
                        
                        // Send the response to the WebSocket client
                        await connectionManager.sendMessage(connectionId, terminalResponse);
                    }
                } catch (processingError) {
                    logger.error('BrainController processing error', {
                        error: processingError instanceof Error ? processingError.message : String(processingError),
                        stack: processingError instanceof Error ? processingError.stack : undefined,
                        brainName,
                        conversationId
                    });
                    
                    // Try to reinitialize the brain controller and retry once
                    try {
                        logger.info('Attempting to reinitialize BrainController and retry');
                        await brainController.initialize();
                        
                        // Retry the request after initialization
                        const retryResponse = await brainController.processRequest(request);
                        
                        logger.info('Successfully processed MCP result after reinitialization', {
                            responseType: retryResponse.type,
                            contentLength: retryResponse.data.content ? retryResponse.data.content.length : 0
                        });
                        
                        // ALSO SEND THE RETRY RESPONSE BACK TO THE CLIENT
                        if (retryResponse) {
                            // Create a proper terminal response message format
                            const terminalResponse = {
                                action: retryResponse.type,
                                data: {
                                    ...retryResponse.data,
                                    commandId: `result_${body.data.commandId || body.data.requestId}`,
                                    timestamp: new Date().toISOString()
                                }
                            };
                            
                            logger.info('Sending retry LLM response to client', {
                                connectionId,
                                responseType: retryResponse.type,
                                contentLength: retryResponse.data.content ? retryResponse.data.content.length : 0
                            });
                            
                            // Send the response to the WebSocket client
                            await connectionManager.sendMessage(connectionId, terminalResponse);
                        }
                    } catch (retryError) {
                        // If retry also fails, propagate the error
                        logger.error('Failed to process MCP result even after reinitializing', {
                            error: retryError instanceof Error ? retryError.message : String(retryError),
                            stack: retryError instanceof Error ? retryError.stack : undefined
                        });
                        
                        // Send an error message to the client
                        await connectionManager.sendMessage(connectionId, {
                            action: 'brain/terminal/error',
                            data: {
                                content: `Failed to process MCP command result: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`,
                                source: 'system',
                                timestamp: new Date().toISOString(),
                                commandId: body.data.commandId || 'error_' + Date.now()
                            }
                        });
                    }
                }
            } catch (llmError) {
                logger.error('Failed to process MCP result through LLM', {
                    error: llmError instanceof Error ? llmError.message : String(llmError),
                    stack: llmError instanceof Error ? llmError.stack : undefined,
                    commandId: body.data.commandId,
                    conversationId: body.data.conversationId,
                    brainName: body.data.brainName || 'default'
                });
                
                // Try to send an error message to the client
                try {
                    await connectionManager.sendMessage(connectionId, {
                        action: 'brain/terminal/error',
                        data: {
                            content: `Error processing MCP command result: ${llmError instanceof Error ? llmError.message : 'Unknown error'}. Please try again.`,
                            source: 'system',
                            timestamp: new Date().toISOString(),
                            commandId: body.data.commandId || 'error_' + Date.now()
                        }
                    });
                } catch (sendError) {
                    logger.error('Failed to send LLM processing error message to client', {
                        error: sendError instanceof Error ? sendError.message : String(sendError),
                        connectionId
                    });
                }
            }
        } else {
            logger.info('Skipping LLM processing for MCP result', {
                missingConversationId: !body.data?.conversationId,
                missingCommandId: !body.data?.commandId,
                notSuccessful: !body.data?.success,
                explicitOptOut: body.data?.processResult === false
            });
        }

        // Return a success response
        return { statusCode: 200, body: 'MCP response processed' };
    } catch (error) {
        logger.error('Error processing MCP response:', { 
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined,
            connectionId,
            userId,
            body: event.body ? JSON.stringify(event.body).substring(0, 200) : undefined
        });
        
        // Try to send an error message to the client
        try {
            await connectionManager.sendMessage(connectionId, {
                action: 'brain/terminal/error',
                data: {
                    content: `Error processing MCP response: ${error instanceof Error ? error.message : 'Unknown error'}`,
                    source: 'system',
                    timestamp: new Date().toISOString(),
                    commandId: 'error_' + Date.now()
                }
            });
        } catch (sendError) {
            logger.error('Failed to send error message to client', {
                error: sendError instanceof Error ? sendError.message : String(sendError),
                connectionId
            });
        }
        
        return { statusCode: 500, body: 'Error processing MCP response' };
    }
};

/**
 * Format MCP result data into a concise summary for the LLM
 */
function formatMcpResultForLLM(data: any): string {
    const { toolName, requestId, result, success } = data;
    
    if (!success) {
        return `Command ${toolName} (ID: ${requestId}) failed: ${data.error || 'Unknown error'}`;
    }
    
    let resultString;
    
    // Format the result based on its type
    if (typeof result === 'object') {
        try {
            resultString = JSON.stringify(result, null, 2);
        } catch {
            resultString = String(result);
        }
    } else {
        resultString = String(result);
    }
    
    return `Command ${toolName} (ID: ${requestId}) executed successfully. Result: ${resultString}`;
}
