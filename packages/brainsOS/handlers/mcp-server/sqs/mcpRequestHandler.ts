import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { SQSClient, DeleteMessageCommand, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Resource } from 'sst';
import { ConnectionManager } from '../../system/websocket/connectionManager';
import { MCPServer } from '../../../modules/mcp-server/src/MCPServer';

const logger = new Logger('MCPRequestHandler-SQS');

// Interface for MCP request message
interface MCPRequestMessage {
    requestId: string;
    mcpRequest: {
        requestType: string;
        requestId: string;
        [key: string]: any; // Could be tool, transformer, prompt, etc.
    };
    responseChannel: string;
    userId: string;
    conversationId?: string;
    commandId?: string;
    timestamp: string;
    brainName?: string;
}

export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
    logger.info(`Processing ${event.Records.length} MCP request records`);

    // Initialize connection manager and SQS client
    const connectionManager = ConnectionManager.getInstance();
    const sqsClient = new SQSClient({});
    
    // Initialize MCPServer - the singleton that will process all MCP requests
    let mcpServer: MCPServer;
    try {
        mcpServer = await MCPServer.create();
        await mcpServer.initialize();
        logger.info('MCP Server initialized successfully');
    } catch (error) {
        logger.error('Failed to initialize MCP Server:', error);
        throw error; // Cannot proceed without MCPServer
    }

    for (const record of event.Records) {
        try {
            const message: MCPRequestMessage = JSON.parse(record.body);
            logger.info(`Processing MCP request: ${JSON.stringify(message)}`);

            const { requestId, mcpRequest, responseChannel, userId, conversationId, commandId } = message;
            const requestType = mcpRequest.requestType;
            
            // Select the appropriate MCP service based on request type
            let response;
            
            logger.info(`Processing ${requestType} request`, { requestId });
            
            switch (requestType) {
                case 'tool':
                    response = await mcpServer.processRequest(mcpRequest as any);
                    break;
                    
                case 'transformer':
                    response = await mcpServer.processTransformerRequest(mcpRequest as any);
                    break;
                    
                // Add cases for other request types as they're implemented in MCPServer
                // case 'prompt':
                //    response = await mcpServer.processPromptRequest(mcpRequest);
                //    break;
                
                default:
                    logger.warn(`Unknown request type: ${requestType}`);
                    response = {
                        success: false,
                        error: `Unsupported request type: ${requestType}`,
                        metadata: {
                            requestId,
                            processingTimeMs: 0,
                            timestamp: new Date().toISOString()
                        }
                    };
            }
            
            // Create the complete message for the queue
            const queueMessage = {
                requestId,
                mcpRequest,
                responseChannel,
                userId,
                conversationId,
                commandId,
                brainName: message.brainName || 'default',
                timestamp: new Date().toISOString()
            };

            // Prepare a generic response payload
            const responsePayload = {
                action: 'brain/mcp/response',
                data: {
                    requestId,
                    requestType,
                    success: response.success,
                    result: response.success ? response.data : null,
                    error: !response.success ? extractErrorMessage(response) : '',
                    timestamp: new Date().toISOString(),
                    responseChannel,
                    userId,
                    conversationId,
                    commandId,
                    brainName: message.brainName || 'default',
                    // Add request-type specific fields
                    ...(requestType === 'tool' && { toolName: mcpRequest.toolName }),
                    ...(requestType === 'transformer' && { 
                        objectType: mcpRequest.objectType,
                        fromView: mcpRequest.fromView,
                        toView: mcpRequest.toView
                    })
                }
            };

            // Send response to the response queue instead of directly to WebSocket
            if (responseChannel) {
                try {
                    logger.info(`Sending ${requestType} response to response queue`, {
                        success: response.success,
                        responseChannel,
                        requestId
                    });
                    
                    // Send to SQS response queue
                    await sqsClient.send(new SendMessageCommand({
                        QueueUrl: Resource.brainsOS_queue_mcp_server_response.url,
                        MessageBody: JSON.stringify(responsePayload)
                    }));
                    
                    logger.info(`Successfully sent response to queue for channel: ${responseChannel}`);
                } catch (sqsError) {
                    logger.error(`Error sending response to SQS queue:`, sqsError);
                }
            } else {
                logger.warn(`No response channel provided for request: ${requestId}`);
            }

            // Delete the processed message from the queue
            try {
                await sqsClient.send(new DeleteMessageCommand({
                    QueueUrl: Resource.brainsOS_queue_mcp_server_request.url,
                    ReceiptHandle: record.receiptHandle
                }));
                logger.info(`Deleted processed message from queue: ${requestId}`);
            } catch (deleteError) {
                logger.error(`Error deleting message from queue:`, deleteError);
            }
        } catch (error) {
            logger.error(`Error processing SQS record:`, error);
            
            // Still try to delete the message to prevent reprocessing
            try {
                await sqsClient.send(new DeleteMessageCommand({
                    QueueUrl: Resource.brainsOS_queue_mcp_server_request.url,
                    ReceiptHandle: record.receiptHandle
                }));
                logger.info(`Deleted failed message from queue`);
            } catch (deleteError) {
                logger.error(`Error deleting failed message from queue:`, deleteError);
            }
        }
    }
};

/**
 * Safely extracts error message from a response without depending on specific error types
 */
function extractErrorMessage(response: any): string {
    if (!response) return 'Unknown error';
    
    // Try to extract error message using common patterns without relying on specific types
    if (typeof response.error === 'string') return response.error;
    if (response.error?.message) return response.error.message;
    if (response.errorMessage) return response.errorMessage;
    if (response.message) return response.message;
    
    return 'MCP request execution failed';
}  