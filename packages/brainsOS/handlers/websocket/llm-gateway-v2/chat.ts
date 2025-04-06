/**
 * This file implements a WebSocket handler for the LLM Gateway.
 * It's responsible for:
 * 1. Managing WebSocket connections
 * 2. Processing LLM requests (both streaming and non-streaming)
 * 3. Handling errors and providing appropriate responses
 * 
 * Key Concepts:
 * - WebSocket: A protocol for real-time, bidirectional communication
 * - Singleton Pattern: Used for Gateway and ConnectionManager to ensure single instances
 * - Async/Await: Used for handling asynchronous operations
 * - Error Handling: Comprehensive error handling with proper logging
 */

import { Logger } from '../../shared/logging/logger';
import { Gateway } from '../../../llm-gateway-v2/src/Gateway';
import { GatewayRequest } from '../../../llm-gateway-v2/src/types/Request';
import { ConnectionManager } from './connectionManager';
import { StreamHandler } from './streamHandler';
import { Resource } from 'sst';
// Define the structure of a WebSocket event
// This matches the format provided by AWS API Gateway WebSocket events
interface WebSocketEvent {
  requestContext: {
    connectionId: string;  // Unique ID for this WebSocket connection
    authorizer?: {
      userId: string;     // User ID if authentication is enabled
    };
  };
  body?: string;          // The actual message content
}

// Initialize logging and connection management
const logger = new Logger('LLMGatewayV2Chat');
const connectionManager = ConnectionManager.getInstance();
const streamHandler = new StreamHandler();

// Global state for the LLM Gateway
// This is a singleton pattern to ensure we only have one gateway instance
let gateway: Gateway;

/**
 * Initializes the LLM Gateway with provider configurations.
 * This is a critical setup step that:
 * 1. Creates a new Gateway instance
 * 2. Loads configuration from the config directory
 * 3. Sets up providers and models
 * 
 * @throws {Error} If initialization fails
 */
const initializeGateway = async () => {
  try {
    logger.info('Initializing Gateway', {
      websocketEndpoint: Resource.brains_websocket_api_latest.url
    });

    gateway = new Gateway();
    await gateway.initialize('local');

    logger.info('Gateway initialized successfully');
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to initialize gateway:', {
      error: err
    });
    throw err;
  }
};

// Initialize gateway immediately and ensure it's ready before handling requests
let initializationPromise: Promise<void>;

/**
 * Ensures the LLM Gateway is initialized before handling any requests.
 * This uses a singleton pattern to prevent multiple initializations.
 * 
 * @returns Promise that resolves when gateway is ready
 */
const ensureInitialized = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeGateway();
  }
  return initializationPromise;
};

// Initialize gateway immediately
// This starts the initialization process as soon as the module is loaded
initializationPromise = initializeGateway().catch(error => {
  logger.error('Failed to initialize gateway:', error);
  throw error;
});

/**
 * Main handler for LLM chat requests.
 * This is the entry point for all WebSocket messages.
 * It handles:
 * 1. Connection management
 * 2. Request parsing and validation
 * 3. Streaming and non-streaming responses
 * 4. Error handling
 * 
 * @param event - WebSocket event containing the chat request
 * @returns Response object with appropriate status code
 */
export const handler = async (event: WebSocketEvent) => {
  // Extract connection and user information
  const connectionId = event.requestContext.connectionId;
  const userId = event.requestContext.authorizer?.userId;

  // Register this connection with the connection manager
  connectionManager.addConnection(connectionId);

  // Log the incoming request
  logger.info('Processing LLM request', {
    connectionId,
    userId,
    body: event.body
  });

  try {
    // Ensure gateway is initialized before processing
    await ensureInitialized();

    // Parse the incoming request
    const body = JSON.parse(event.body || '{}');
    
    // Validate action format
    if (body.action !== 'llm/chat') {
      logger.error('Invalid action type', { action: body.action });
      await connectionManager.sendMessage(connectionId, {
        type: 'error',
        data: {
          message: 'Invalid action type',
          code: 'INVALID_ACTION'
        }
      });
      return { statusCode: 400 };
    }

    // Extract the data payload
    const data = body.data;
    if (!data) {
      logger.error('Missing data payload', { body });
      await connectionManager.sendMessage(connectionId, {
        type: 'error',
        data: {
          message: 'Missing data payload',
          code: 'INVALID_REQUEST'
        }
      });
      return { statusCode: 400 };
    }

    // Validate required fields
    if (!data.messages?.length && !data.prompt) {
      logger.error('Invalid request: missing messages or prompt', { data });
      await connectionManager.sendMessage(connectionId, {
        type: 'error',
        data: {
          message: 'Either messages or prompt must be provided',
          code: 'INVALID_REQUEST'
        }
      });
      return { statusCode: 400 };
    }

    // Create a GatewayRequest object with default values
    const request: GatewayRequest = {
      provider: data.provider || 'bedrock',  // Default to Bedrock provider
      modelId: data.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0',  // Default model
      messages: data.messages || [],
      prompt: data.prompt,
      modality: 'text-to-text',     // Always use text-to-text regardless of input modality
      streaming: data.stream || false,  // Whether to stream the response
      maxTokens: data.maxTokens,
      temperature: data.temperature,
      metadata: {
        ...data.metadata,
        userId,
        connectionId,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Prepared request:', {
      modelId: request.modelId,
      provider: request.provider,
      hasMessages: request.messages?.length > 0,
      hasPrompt: !!request.prompt,
      streaming: request.streaming
    });

    // Handle streaming request
    if (request.streaming) {
      // Get the stream from the gateway
      const stream = gateway.streamChat(request);
      
      // Pass the stream to the stream handler
      await streamHandler.handleStream(
        stream,
        connectionId,
        userId,
        data.conversationId,
        data.metadata
      );
      return { statusCode: 200 };
    }

    // Handle non-streaming request
    const response = await gateway.chat(request);
    
    logger.debug('Received response from gateway:', {
      response,
      modelId: request.modelId
    });
    
    // Send the response back to the client
    await connectionManager.sendMessage(connectionId, {
      type: 'chat',
      data: {
        content: response.content,
        metadata: response.metadata
      }
    });

    return { statusCode: 200 };
  } catch (error) {
    // Log the error
    logger.error('Failed to process LLM request:', {
      error,
      connectionId,
      userId
    });

    // Send error message to client
    await connectionManager.sendMessage(connectionId, {
      type: 'error',
      data: {
        message: error.message,
        code: error.code || 'INTERNAL_ERROR'
      }
    });

    return { statusCode: 500 };
  }
}; 