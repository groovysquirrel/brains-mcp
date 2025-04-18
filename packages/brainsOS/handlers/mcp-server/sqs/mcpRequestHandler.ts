/*
|  +265ms      [2025-04-17T16:50:04.706Z] [BrainControllerAPIHandler] Successfully queued tool request {
    |  +265ms        requestId: 'req_1744908604462_s91exadyg',
    |  +265ms        toolName: 'calculator',
    |  +265ms        userId: 'c4389418-5071-7055-0330-a36545bd8601'
    |  +265ms      }

*/

/*

Processing message:
{"requestId":"req_1744908604462_s91exadyg",
"mcpRequest":{"requestType":"tool","requestId":"req
_1744908604462_s91exadyg","toolName":"calculator","parameter
s":{"operation":"add","a":5,"b":3}},"responseChannel":"api_1
744908604462_jjeb728rr","userId":"c4389418-5071-7055-0330-a3
6545bd8601","timestamp":"2025-04-17T16:50:04.462Z"}

*/
import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
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

            const { requestId, mcpRequest, responseChannel, userId } = message;
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
            
            // Prepare a generic response payload
            const responsePayload = {
                requestId,
                requestType,
                success: response.success,
                result: response.success ? response.data : null,
                error: !response.success ? extractErrorMessage(response) : '',
                timestamp: new Date().toISOString(),
                // Add request-type specific fields
                ...(requestType === 'tool' && { toolName: mcpRequest.toolName }),
                ...(requestType === 'transformer' && { 
                    objectType: mcpRequest.objectType,
                    fromView: mcpRequest.fromView,
                    toView: mcpRequest.toView
                })
            };

            // Send response to the WebSocket connection
            if (responseChannel) {
                try {
                    logger.info(`Sending ${requestType} response to channel: ${responseChannel}`, {
                        success: response.success
                    });
                    
                    await connectionManager.sendMessage(responseChannel, {
                        type: 'rain/mcp/response',
                        data: responsePayload
                    });
                    
                    logger.info(`Successfully sent response to channel: ${responseChannel}`);
                } catch (wsError) {
                    logger.error(`Error sending response to WebSocket:`, wsError);
                }
            } else {
                logger.warn(`No response channel provided for request: ${requestId}`);
            }

            // Delete the processed message from the queue
            try {
                await sqsClient.send(new DeleteMessageCommand({
                    QueueUrl: Resource.brainsOS_mcpServerRequestQueue.url,
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
                    QueueUrl: Resource.brainsOS_mcpServerRequestQueue.url,
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