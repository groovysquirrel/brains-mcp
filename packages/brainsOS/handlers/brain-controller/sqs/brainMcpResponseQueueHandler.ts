/**
 * SQS handler for MCP response queue.
 * This handler processes MCP responses and forwards them to WebSocket clients.
 * It also sends the results to the LLM for further processing.
 */

import { SQSEvent, SQSRecord } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { Resource } from 'sst';
import { ConnectionManager } from '../../system/websocket/connectionManager';
import { BrainController } from '../../../modules/brain-controller/src/BrainController';

// Initialize logging and connection management
const logger = new Logger('BrainMcpResponseQueueHandler-SQS');
const connectionManager = ConnectionManager.getInstance();

// Initialize the brain controller with default options
const brainController = BrainController.getInstance();

// Initialize the brain controller - this is executed at module load time
// but we'll also ensure initialization in the handler
let initializationPromise = brainController.initialize().catch(error => {
  logger.error('Failed to initialize brain controller during module load:', error);
  // Don't throw here, we'll retry in the handler
});

const sqsClient = new SQSClient({});

/**
 * Process MCP command responses from SQS
 */
export const handler = async (event: SQSEvent): Promise<void> => {
  logger.info(`Processing ${event.Records.length} MCP response records`);
  
  // Ensure brain controller is initialized before processing the records
  try {
    // First, wait for any existing initialization to complete
    await initializationPromise;
    
    // Then explicitly ensure initialization
    await brainController.ensureInitialized();
    
    logger.info('BrainController is properly initialized for SQS processing');
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
  
  for (const record of event.Records) {
    try {
      const message = JSON.parse(record.body);
      logger.info('Processing MCP response message', { 
        action: message.action,
        responseChannel: message.data?.responseChannel,
        requestId: message.data?.requestId
      });
      
      // Extract the response channel (connection ID) from the message
      const responseChannel = message.data?.responseChannel;
      const userId = message.data?.userId;
      const conversationId = message.data?.conversationId;
      const commandId = message.data?.commandId;
      const requestId = message.data?.requestId;
      
      if (!responseChannel) {
        logger.warn('No response channel in message, skipping', { 
          requestId: message.data?.requestId 
        });
        await deleteMessage(record);
        continue;
      }
      
      // Format the status message for received MCP response
      const statusMessage = {
        action: 'brain/terminal/status/mcp',
        data: {
          requestId,
          commandId,
          status: message.data.success ? 'completed' : 'failed',
          message: message.data.success 
            ? `Command "${message.data.toolName}" completed successfully` 
            : `Command "${message.data.toolName}" failed: ${message.data.error || 'Unknown error'}`,
          toolName: message.data.toolName,
          result: message.data.success ? message.data.result : null,
          error: message.data.error || null,
          timestamp: new Date().toISOString()
        }
      };
      
      // Send the status message
      try {
        await connectionManager.sendMessage(responseChannel, statusMessage);
        logger.info('Successfully sent MCP status message', { 
          connectionId: responseChannel,
          requestId,
          status: message.data.success ? 'completed' : 'failed'
        });
      } catch (wsError) {
        logger.error('Failed to send status message', { 
          error: wsError instanceof Error ? wsError.message : String(wsError),
          connectionId: responseChannel,
          requestId
        });
      }
      
      // Format the WebSocket message for MCP response
      const wsMessage = {
        action: 'brain/mcp/response',
        data: {
          ...message.data,
          timestamp: message.data.timestamp || new Date().toISOString()
        }
      };
      
      // Send the MCP response to the WebSocket client
      try {
        await connectionManager.sendMessage(responseChannel, wsMessage);
        logger.info('Successfully sent MCP response to WebSocket', { 
          connectionId: responseChannel,
          requestId
        });
      } catch (wsError) {
        logger.error('Failed to send message to WebSocket', { 
          error: wsError instanceof Error ? wsError.message : String(wsError),
          connectionId: responseChannel,
          requestId
        });
      }
      
      // Process the result through the LLM if we have a conversation context
      if (conversationId && message.data.success) {
        try {
          logger.info('Processing MCP result through LLM', {
            connectionId: responseChannel,
            conversationId,
            commandId,
            requestId
          });
          
          // Make sure we have a valid brain controller
          if (!brainController) {
            throw new Error('BrainController is not initialized');
          }
          
          // IMPORTANT: Register the conversation mapping explicitly to ensure continuity
          // This prevents BrainController from creating a new conversation for this connection
          brainController.registerConversationMapping(responseChannel, conversationId);
          
          // Format the MCP result for the LLM
          const resultSummary = formatMcpResultForLLM(message.data);
          
          // Create a request for the BrainController
          const request = {
            action: 'brain/terminal/request' as const,
            data: {
              connectionId: responseChannel,
              userId,
              conversationId,
              commandId: `result_${commandId || requestId}`,
              messages: [{
                role: 'user',
                content: `Process these command results: ${resultSummary}`
              }],
              rawData: null, // Set explicitly to null to ensure messages is used
              requestStreaming: false,
              timestamp: new Date().toISOString(),
              source: 'terminal',
              brainName: message.data.brainName || 'default'
            }
          };
          
          // Send the request to the BrainController
          try {
            const response = await brainController.processRequest(request);
            
            logger.info('Successfully processed MCP result through LLM', {
              connectionId: responseChannel,
              conversationId,
              responseType: response.type,
              contentLength: response.data.content ? response.data.content.length : 0
            });
            
            // SEND THE RESPONSE BACK TO THE CLIENT
            if (response) {
              // Create a proper terminal response message format
              const terminalResponse = {
                action: response.type,
                data: {
                  ...response.data,
                  commandId: `result_${commandId || requestId}`,
                  timestamp: new Date().toISOString()
                }
              };
              
              logger.info('Sending final LLM response to client', {
                connectionId: responseChannel,
                responseType: response.type,
                contentLength: response.data.content ? response.data.content.length : 0
              });
              
              // Send the response to the WebSocket client
              await connectionManager.sendMessage(responseChannel, terminalResponse);
            }
          } catch (processingError) {
            logger.error('BrainController processing error', {
              error: processingError instanceof Error ? processingError.message : String(processingError),
              stack: processingError instanceof Error ? processingError.stack : undefined,
              brainName: message.data.brainName || 'default',
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
                    commandId: `result_${commandId || requestId}`,
                    timestamp: new Date().toISOString()
                  }
                };
                
                logger.info('Sending retry LLM response to client', {
                  connectionId: responseChannel,
                  responseType: retryResponse.type,
                  contentLength: retryResponse.data.content ? retryResponse.data.content.length : 0
                });
                
                // Send the response to the WebSocket client
                await connectionManager.sendMessage(responseChannel, terminalResponse);
              }
            } catch (retryError) {
              // If retry also fails, log the error and notify the client
              logger.error('Failed to process MCP result even after reinitializing', {
                error: retryError instanceof Error ? retryError.message : String(retryError),
                stack: retryError instanceof Error ? retryError.stack : undefined
              });
              
              // Send an error message to the client
              try {
                await connectionManager.sendMessage(responseChannel, {
                  action: 'brain/terminal/error',
                  data: {
                    content: `Failed to process MCP command result: ${retryError instanceof Error ? retryError.message : 'Unknown error'}`,
                    source: 'system',
                    timestamp: new Date().toISOString(),
                    commandId: commandId || 'error_' + Date.now()
                  }
                });
              } catch (sendError) {
                logger.error('Failed to send error message to client', {
                  error: sendError instanceof Error ? sendError.message : String(sendError),
                  connectionId: responseChannel
                });
              }
            }
          }
        } catch (error) {
          logger.error('Failed to process MCP result through LLM', {
            error: error instanceof Error ? error.message : String(error),
            connectionId: responseChannel,
            conversationId,
            requestId
          });
        }
      } else if (!message.data.success) {
        logger.warn('Not processing failed MCP result through LLM', {
          connectionId: responseChannel,
          requestId,
          error: message.data.error
        });
      } else if (!conversationId) {
        logger.warn('No conversation ID, not processing through LLM', {
          connectionId: responseChannel,
          requestId
        });
      }
      
      // Delete the message from the queue regardless of processing success
      await deleteMessage(record);
      
    } catch (error) {
      logger.error('Error processing SQS record', { 
        error: error instanceof Error ? error.message : String(error),
        recordBody: record.body
      });
      
      // Delete failed messages to prevent queue blocking
      await deleteMessage(record);
    }
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

/**
 * Helper function to delete a message from the queue
 */
async function deleteMessage(record: SQSRecord): Promise<void> {
  try {
    await sqsClient.send(new DeleteMessageCommand({
      QueueUrl: Resource.brainsOS_queue_mcp_server_response.url,
      ReceiptHandle: record.receiptHandle
    }));
    logger.debug('Deleted message from response queue', { 
      messageId: record.messageId 
    });
  } catch (error) {
    logger.error('Failed to delete message from queue', { 
      error: error instanceof Error ? error.message : String(error),
      messageId: record.messageId
    });
  }
} 