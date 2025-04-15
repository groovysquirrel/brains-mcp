/**
 * MCP WebSocket Handler
 * 
 * This module handles WebSocket connections and requests for the MCP (Model Control Protocol) server.
 * It manages tool execution, tool listing, and error handling through WebSocket connections.
 */

import { Logger } from '../../shared/logging/logger';
import { MCPServer } from '../../../modules/mcp-server/src/MCPServer';
import { ConnectionManager } from '../util/connectionManager';
import { WebSocketEvent } from '../websocketTypes';

/**
 * Custom error type for MCP WebSocket errors
 */
interface MCPWebSocketError extends Error {
  code?: string;
}

/**
 * Interface for WebSocket message structure
 */
interface WebSocketMessage {
  action: string;
  data: {
    type: string;
    action: string;
    toolName?: string;
    parameters?: Record<string, any>;
    requestId?: string;
  };
}

// Initialize logging and connection management
const logger = new Logger('MCP-server-websocket');
const connectionManager = ConnectionManager.getInstance();

// Initialize MCP server instance
let mcpServer: MCPServer;

/**
 * Initializes the MCP server
 * This is called once when the module is loaded
 */
async function initializeMCPServer(): Promise<void> {
  try {
    mcpServer = await MCPServer.create();
    await mcpServer.initialize();
    logger.info('MCP server initialized successfully');
  } catch (error) {
    logger.error('Failed to initialize MCP server:', error);
    throw error; // Re-throw to be handled by the handler
  }
}

/**
 * Validates the incoming WebSocket message structure
 * @param body - The parsed message body
 * @throws Error if the message is invalid
 */
function validateMessage(body: any): void {
  if (!body.action || !body.data) {
    throw new Error('Missing required fields: action, data');
  }

  if (body.action !== 'mcp/request') {
    throw new Error(`Unsupported action: ${body.action}`);
  }

  const { type, action: toolAction } = body.data;
  if (!type || !toolAction) {
    throw new Error('Missing required fields in data: type, action');
  }
}

/**
 * Handles tool-related requests
 * @param toolAction - The specific tool action to perform
 * @param data - The request data
 * @returns The response data
 */
async function handleToolRequest(toolAction: string, data: WebSocketMessage['data']): Promise<any> {
  switch (toolAction) {
    case 'list':
      return await mcpServer.listTools();

    case 'execute':
      const { toolName, parameters } = data;
      if (!toolName || !parameters) {
        throw new Error('Missing required fields: toolName, parameters');
      }
      return await mcpServer.processRequest({
        toolName,
        parameters,
        requestId: data.requestId || crypto.randomUUID()
      });

    default:
      throw new Error(`Unsupported tool action: ${toolAction}`);
  }
}

/**
 * Sends an error response to the client
 * @param connectionId - The WebSocket connection ID
 * @param error - The error to send
 */
async function sendErrorResponse(connectionId: string, error: MCPWebSocketError): Promise<void> {
  await connectionManager.sendMessage(connectionId, {
    type: 'error',
    data: {
      message: error.message,
      code: error.code || 'INTERNAL_ERROR'
    }
  });
}

/**
 * Main WebSocket handler function
 * Processes incoming WebSocket messages and routes them to appropriate handlers
 */
export const handler = async (event: WebSocketEvent) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.requestContext.authorizer?.userId;

  // Register this connection with the connection manager
  connectionManager.addConnection(connectionId);

  logger.info('Processing MCP request', {
    connectionId,
    userId,
    body: event.body
  });

  try {
    // Ensure MCP server is initialized
    if (!mcpServer) {
      await initializeMCPServer();
    }

    // Parse and validate the incoming request
    const body = JSON.parse(event.body || '{}') as WebSocketMessage;
    validateMessage(body);

    const { type, action: toolAction } = body.data;
    let response;

    // Route the request based on type
    switch (type) {
      case 'tool':
        response = await handleToolRequest(toolAction, body.data);
        break;

      default:
        throw new Error(`Unsupported request type: ${type}`);
    }

    // Send success response to client
    await connectionManager.sendMessage(connectionId, {
      type: 'mcp/response',
      data: response
    });

    return { statusCode: 200 };
  } catch (error: any) {
    logger.error('Failed to process WebSocket event:', {
      error,
      connectionId,
      userId
    });
    
    // Send error response to client
    await sendErrorResponse(connectionId, error as MCPWebSocketError);

    return { statusCode: 500 };
  }
};
