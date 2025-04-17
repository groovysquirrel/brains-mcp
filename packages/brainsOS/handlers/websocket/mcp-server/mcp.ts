/**
 * MCP WebSocket Handler
 * 
 * This module handles WebSocket connections and requests for the MCP (Model Control Protocol) server.
 * It manages tool execution, tool listing, and error handling through WebSocket connections.
 */

import { Logger } from '../../../utils/logging/logger';
import { MCPServer } from '../../../modules/mcp-server/src/MCPServer';
import { ConnectionManager } from '../utils/connectionManager';
import { WebSocketEvent } from '../websocketTypes';
import {
  ToolRequest,
  ToolResponse,
  ToolInfo,
  TransformerRequest,
  TransformerResult,
  TransformerInfo,
  MCPErrorCode
} from '../../../modules/mcp-server/src/types';

/**
 * Interface for WebSocket message structure
 */
interface WebSocketMessage {
  action: string;
  data: {
    type: 'tool' | 'transformer';
    action: 'list' | 'execute';
    toolName?: string;
    parameters?: Record<string, any>;
    objectType?: string;
    fromView?: string;
    toView?: string;
    input?: any;
    requestId?: string;
  };
}

/**
 * Interface for WebSocket response structure
 */
interface WebSocketResponse {
  type: 'mcp/response' | 'error';
  data: ToolResponse | TransformerResult | ToolInfo[] | TransformerInfo[] | {
    message: string;
    code: MCPErrorCode;
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
function validateMessage(body: any): asserts body is WebSocketMessage {
  if (!body.action || !body.data) {
    throw new Error('Missing required fields: action, data');
  }

  if (body.action !== 'mcp/request') {
    throw new Error(`Unsupported action: ${body.action}`);
  }

  const { type, action } = body.data;
  if (!type || !action) {
    throw new Error('Missing required fields in data: type, action');
  }

  if (type !== 'tool' && type !== 'transformer') {
    throw new Error(`Unsupported type: ${type}`);
  }

  if (action !== 'list' && action !== 'execute') {
    throw new Error(`Unsupported action: ${action}`);
  }
}

/**
 * Handles tool-related requests
 * @param toolAction - The specific tool action to perform
 * @param data - The request data
 * @returns The response data
 */
async function handleToolRequest(toolAction: string, data: WebSocketMessage['data']): Promise<ToolResponse | ToolInfo[]> {
  switch (toolAction) {
    case 'list':
      return await mcpServer.listTools();

    case 'execute':
      const { toolName, parameters } = data;
      if (!toolName || !parameters) {
        throw new Error('Missing required fields: toolName, parameters');
      }
      return await mcpServer.processRequest({
        requestType: 'tool',
        toolName,
        parameters,
        requestId: data.requestId || crypto.randomUUID()
      });

    default:
      throw new Error(`Unsupported tool action: ${toolAction}`);
  }
}

/**
 * Handles transformer-related requests
 * @param transformerAction - The specific transformer action to perform
 * @param data - The request data
 * @returns The response data
 */
async function handleTransformerRequest(transformerAction: string, data: WebSocketMessage['data']): Promise<TransformerResult | TransformerInfo[]> {
  switch (transformerAction) {
    case 'list':
      return await mcpServer.listTransformers();

    case 'execute':
      const { objectType, fromView, toView, input } = data;
      if (!objectType || !fromView || !toView || !input) {
        throw new Error('Missing required fields: objectType, fromView, toView, input');
      }
      return await mcpServer.processTransformerRequest({
        requestType: 'transformer',
        objectType,
        fromView,
        toView,
        input,
        requestId: data.requestId || crypto.randomUUID()
      });

    default:
      throw new Error(`Unsupported transformer action: ${transformerAction}`);
  }
}

/**
 * Sends an error response to the client
 * @param connectionId - The WebSocket connection ID
 * @param error - The error to send
 */
async function sendErrorResponse(connectionId: string, error: Error): Promise<void> {
  await connectionManager.sendMessage(connectionId, {
    type: 'error',
    data: {
      message: error.message,
      code: MCPErrorCode.INTERNAL_ERROR
    }
  } as WebSocketResponse);
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
    const body = JSON.parse(event.body || '{}');
    validateMessage(body);

    const { type, action } = body.data;
    let response;

    // Route the request based on type
    switch (type) {
      case 'tool':
        response = await handleToolRequest(action, body.data);
        break;

      case 'transformer':
        response = await handleTransformerRequest(action, body.data);
        break;

      default:
        throw new Error(`Unsupported request type: ${type}`);
    }

    // Send success response to client
    await connectionManager.sendMessage(connectionId, {
      type: 'mcp/response',
      data: response
    } as WebSocketResponse);

    return { statusCode: 200 };
  } catch (error) {
    logger.error('Failed to process WebSocket event:', {
      error,
      connectionId,
      userId
    });
    
    // Send error response to client
    await sendErrorResponse(connectionId, error instanceof Error ? error : new Error('Unknown error'));

    return { statusCode: 500 };
  }
};
