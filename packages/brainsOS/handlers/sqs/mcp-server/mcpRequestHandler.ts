/**
 * MCP Request Queue Handler
 * 
 * This handler processes MCP requests from the SQS queue, forwarding them to the MCP server
 * and sending responses back to the client through the WebSocket connection.
 * 
 * The flow is:
 * 1. SQS message received → 2. Process MCP request → 3. Send response via WebSocket
 */

import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { Resource } from 'sst';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { MCPServer } from '../../../modules/mcp-server/src/MCPServer';
import { ConnectionManager } from '../../websocket/utils/connectionManager';
import { ToolRequest, ToolResponse, MCPErrorCode, MCPErrorResponse } from '../../../modules/mcp-server/src/types';

// Initialize logger and SQS client
const logger = new Logger('MCPRequestHandler');
const sqsClient = new SQSClient({});
const connectionManager = ConnectionManager.getInstance();

// Initialize MCP Server
let mcpServer: MCPServer | null = null;
let mcpServerInitPromise: Promise<void> | null = null;

/**
 * SQS message format coming from the brain controller
 */
interface MCPQueueMessage {
  requestId: string;
  mcpRequest: ToolRequest;
  responseChannel: string;  // WebSocket connection ID
  userId?: string;
  conversationId?: string;
  commandId?: string;       // Original command ID from the terminal
  timestamp: string;
  metadata?: Record<string, unknown>;
}

/**
 * Response format to send back to the client
 */
interface MCPResponseMessage {
  type: 'mcp/response';
  data: {
    requestId: string;
    toolName: string;
    response: any;
    success: boolean;
    error?: {
      code: string;
      message: string;
    };
    metadata: {
      processingTimeMs: number;
      timestamp: string;
      commandId?: string;
      conversationId?: string;
    };
  };
}

/**
 * Type guard to check if a response is an error response
 */
function isErrorResponse(response: ToolResponse): response is MCPErrorResponse {
  return !response.success;
}

/**
 * Ensures the MCP Server is initialized
 * @returns Promise that resolves when MCP Server is ready
 */
async function ensureMCPServerInitialized(): Promise<MCPServer> {
  if (!mcpServer) {
    logger.info('Initializing MCP Server');
    
    mcpServer = await MCPServer.create();
    mcpServerInitPromise = mcpServer.initialize();
    await mcpServerInitPromise;
    
    logger.info('MCP Server initialized successfully');
  } else if (mcpServerInitPromise) {
    // Wait for existing initialization to complete
    await mcpServerInitPromise;
  }
  
  return mcpServer;
}

/**
 * Main handler for processing SQS events containing MCP requests
 */
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.info(`Processing ${event.Records.length} MCP request records`);
  
  try {
    // Initialize MCP Server
    mcpServer = await ensureMCPServerInitialized();
    
    // Process each record in the batch
    for (const record of event.Records) {
      try {
        await processMCPRequestRecord(record);
      } catch (error) {
        logger.error('Error processing MCP request record', { 
          error, 
          recordId: record.messageId 
        });
        // Continue with other records even if one fails
      }
    }
  } catch (error) {
    logger.error('Error processing MCP request batch', { error });
    throw error;
  }
};

/**
 * Process a single MCP request record from the queue
 * @param record - The SQS record containing the MCP request
 */
async function processMCPRequestRecord(record: SQSRecord): Promise<void> {
  try {
    // Parse the message body
    const body: MCPQueueMessage = JSON.parse(record.body);
    
    const { requestId, mcpRequest, responseChannel, commandId, conversationId } = body;
    
    // Log basic request info
    logger.info('Processing MCP request', {
      requestId,
      toolName: mcpRequest.toolName,
      connectionId: responseChannel
    });
    
    // Check if connection is still active before processing
    if (!connectionManager.isConnectionActive(responseChannel)) {
      logger.warn('Connection no longer active, skipping request', { 
        requestId, 
        connectionId: responseChannel 
      });
      
      // Delete message from queue - client is gone, no point in retrying
      await deleteMessageFromQueue(record);
      return;
    }
    
    const startTime = Date.now();
    
    // Process the request through MCP Server
    const response: ToolResponse = await mcpServer!.processRequest(mcpRequest);
    
    // Build response message to send back via WebSocket
    const responseMessage: MCPResponseMessage = {
      type: 'mcp/response',
      data: {
        requestId,
        toolName: mcpRequest.toolName,
        response: response.success ? response.data : null,
        success: response.success,
        error: isErrorResponse(response) ? {
          code: response.error.code,
          message: response.error.message
        } : undefined,
        metadata: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          commandId,
          conversationId
        }
      }
    };
    
    // Send response back to the client via WebSocket
    await connectionManager.sendMessage(responseChannel, responseMessage);
    
    logger.info('MCP response sent', {
      requestId,
      success: response.success,
      processingTimeMs: Date.now() - startTime
    });
    
    // Delete message from the queue after successful processing
    await deleteMessageFromQueue(record);
  } catch (error) {
    logger.error('Failed to process MCP request', { error });
    throw error; // Rethrow to be caught by the main handler
  }
}

/**
 * Deletes a message from the SQS queue
 * @param record - The SQS record to delete
 */
async function deleteMessageFromQueue(record: SQSRecord): Promise<void> {
  if (record.receiptHandle) {
    await sqsClient.send(new DeleteMessageCommand({
      QueueUrl: Resource.brainsOS_mcpServerRequestQueue.url,
      ReceiptHandle: record.receiptHandle
    }));
    
    logger.debug('Deleted message from queue', { messageId: record.messageId });
  }
}
