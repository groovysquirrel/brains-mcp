/**
 * WebSocket handler for receiving MCP responses.
 * This handler simply logs the responses to the console.
 */

import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { Logger } from '../../../utils/logging/logger';

// Initialize logging
const logger = new Logger('MCPResponseReceiver');

/**
 * Creates a standardized WebSocket response
 */
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => {
  return {
    statusCode,
    body: JSON.stringify(body)
  };
};

/**
 * WebSocket handler for MCP response events
 * Logs the responses to the console for debugging and monitoring
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    const connectionId = event.requestContext.connectionId;
    logger.info('Received MCP response', { connectionId });
    
    // Parse the event body
    let body: any;
    try {
      body = event.body ? JSON.parse(event.body) : {};
    } catch (error) {
      logger.error('Failed to parse event body:', error);
      return createResponse(400, { message: 'Invalid JSON in request body' });
    }
    
    // Log the MCP response details
    logger.info('MCP response payload:', { 
      connectionId,
      action: body.action,
      data: body.data
    });
    
    // If requestId is available, log it for better traceability
    if (body.data && body.data.requestId) {
      logger.info(`MCP response for request: ${body.data.requestId}`);
    }
    
    // Log tool results if available
    if (body.data && body.data.toolName) {
      if (body.data.success) {
        logger.info(`Tool execution successful: ${body.data.toolName}`, { 
          result: body.data.result 
        });
      } else {
        logger.warn(`Tool execution failed: ${body.data.toolName}`, { 
          error: body.data.error 
        });
      }
    }
    
    // Simply acknowledge receipt
    return createResponse(200, { message: 'MCP response received' });
  } catch (error) {
    logger.error('Error processing MCP response:', error);
    return createResponse(500, { message: 'Error processing MCP response' });
  }
}; 