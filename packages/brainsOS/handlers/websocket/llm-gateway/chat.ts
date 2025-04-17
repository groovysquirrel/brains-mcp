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

import { Logger } from '../../../utils/logging/logger';
import { Gateway, ConversationOptions } from '../../../modules/llm-gateway/src/Gateway';
import { GatewayRequest } from '../../../modules/llm-gateway/src/types/Request';
import { ConnectionManager } from '../utils/connectionManager';
import { StreamHandler } from './streamHandler';
import { Resource } from 'sst';
import { WebSocketEvent } from '../websocketTypes';


// Initialize logging and connection management
const logger = new Logger('LLM-gateway-websocket-chat');
const connectionManager = ConnectionManager.getInstance();
const streamHandler = new StreamHandler();

// Global state for the LLM Gateway
// This is a singleton pattern to ensure we only have one gateway instance
let gateway: Gateway;

// Interface for message handlers
interface MessageHandler {
  handleMessage(message: any, connectionId: string, userId: string): Promise<any>;
}

// Function to handle WebSocket events
const handleWebSocketEvent = async (event: WebSocketEvent, handler: MessageHandler) => {
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
    
    // Process the message using the provided handler
    const response = await handler.handleMessage(body, connectionId, userId);
    
    // If the handler returns a response, send it to the client
    if (response && response.type !== 'processing') {
      await connectionManager.sendMessage(connectionId, response);
    }
    
    return { statusCode: 200 };
  } catch (error: any) {
    // Log the error
    logger.error('Failed to process WebSocket event:', {
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
      websocketEndpoint: Resource.brainsOS_wss.url
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
 * LLM Chat Message Handler
 * Processes WebSocket messages for LLM chat interactions
 */
export class LLMChatMessageHandler implements MessageHandler {
  private streamHandler: StreamHandler;

  constructor() {
    this.streamHandler = new StreamHandler();
  }

  /**
   * Handles incoming WebSocket messages
   * @param message - The incoming message
   * @param connectionId - The connection ID
   * @param userId - The user ID
   * @returns A response to send back to the client
   */
  async handleMessage(message: any, connectionId: string, userId: string): Promise<any> {
    try {
      const { action, data } = message;

      // Validate the message
      if (!action || !data) {
        return {
          type: 'error',
          data: {
            message: 'Missing required fields: action, data',
            code: 'INVALID_REQUEST'
          }
        };
      }

      // Add connection and userId to data
      const enhancedData = {
        ...data,
        connectionId,
        userId
      };

      // Determine the action to take
      switch (action) {
        case 'llm/chat': // Legacy support for existing action
          return this.handleLLMChat(enhancedData);
          
        case 'llm/prompt':
          return this.handleLLMPrompt(enhancedData);
          
        case 'llm/conversation':
          return this.handleLLMConversation(enhancedData);
          
        default:
          return {
            type: 'error',
            data: {
              message: `Unsupported action: ${action}`,
              code: 'UNSUPPORTED_ACTION'
            }
          };
      }
    } catch (error: any) {
      logger.error('Error handling message:', error);
      return {
        type: 'error',
        data: {
          message: error.message || 'Internal server error',
          code: error.code || 'INTERNAL_ERROR'
        }
      };
    }
  }

  /**
   * Handles a stateless LLM prompt request
   * This won't save conversation history
   * @param data - The prompt request data
   * @returns A response or triggers a streaming response
   */
  private async handleLLMPrompt(data: any): Promise<any> {
    try {
      // Create request object without conversation tracking
      const request: GatewayRequest = {
        provider: data.provider || 'bedrock',  // Default to Bedrock provider
        modelId: data.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0',  // Default model
        messages: data.messages || [],
        prompt: data.prompt,
        modality: data.modality || 'text-to-text',
        streaming: data.streaming || data.stream || false,  // Support both streaming and stream fields
        tokenGrouping: data.tokenGrouping || 5,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        systemPrompt: data.systemPrompt,
        // Add the userId directly to the request for metrics
        userId: data.userId,  
        metadata: {
          ...data.metadata,
          userId: data.userId,
          connectionId: data.connectionId,
          timestamp: new Date().toISOString()
        }
      };

      return this.processStandardLLMRequest(request, data);
    } catch (error: any) {
      logger.error('Error in handleLLMPrompt:', error);
      throw error;
    }
  }

  /**
   * Common method to process LLM requests for prompt actions
   * @param request - The gateway request
   * @param data - The original request data
   * @returns A response or triggers a streaming response
   */
  private async processStandardLLMRequest(request: GatewayRequest, data: any): Promise<any> {
    const { connectionId, userId } = data;

    try {
      // Add source field for metrics tracking
      request.source = 'websocket';
      
      // Handle streaming request
      if (request.streaming) {
        // Set up stream handler
        const stream = gateway.streamChat(request);
        
        // Process the stream (this is asynchronous)
        this.streamHandler.handleStream(
          stream,
          connectionId,
          userId,
          undefined, // No conversation ID for prompt requests
          { timestamp: new Date().toISOString() },
          request // Pass the request for token estimation
        ).catch(error => {
          logger.error('Error handling stream:', error);
        });
        
        // Return immediately with a processing status
        return {
          type: 'processing',
          data: {
            message: 'Stream processing started',
            metadata: {
              userId,
              timestamp: new Date().toISOString(),
              streaming: true
            }
          }
        };
      }
      
      // Handle non-streaming request
      const response = await gateway.chat(request);
      
      return {
        type: 'chat',
        data: {
          content: response.content,
          metadata: {
            ...response.metadata,
            userId,
            timestamp: new Date().toISOString()
          }
        }
      };
    } catch (error: any) {
      logger.error('Error in processStandardLLMRequest:', {
        error,
        connectionId,
        userId
      });
      
      throw error;
    }
  }

  /**
   * Handles a conversation-based LLM request
   * This will load and save conversation history
   * @param data - The conversation request data
   * @returns A response with conversation ID or triggers a streaming response
   */
  private async handleLLMConversation(data: any): Promise<any> {
    try {
      // Ensure userId is present for conversation tracking
      if (!data.userId) {
        throw new Error('userId is required for conversation tracking');
      }

      // Extract title and tags for conversation metadata
      const { title, tags } = data;
      
      // Prepare conversation metadata
      const conversationMetadata = {
        ...(data.metadata || {}),
        userId: data.userId,
        connectionId: data.connectionId,
        timestamp: new Date().toISOString()
      };
      
      // Add title to metadata if provided
      if (title) {
        conversationMetadata.title = title;
      }
      
      // Add tags to metadata if provided
      if (tags && Array.isArray(tags)) {
        conversationMetadata.tags = tags;
      }

      // Create request object with conversation options
      const request: GatewayRequest & ConversationOptions = {
        provider: data.provider || 'bedrock',
        modelId: data.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0',
        messages: data.messages || [],
        prompt: data.prompt,
        modality: data.modality || 'text-to-text',
        streaming: data.streaming || data.stream || false,
        tokenGrouping: data.tokenGrouping || 5,
        maxTokens: data.maxTokens,
        temperature: data.temperature,
        systemPrompt: data.systemPrompt,
        // Add conversation tracking data
        userId: data.userId,
        conversationId: data.conversationId,
        title: data.title,
        source: 'websocket', // Set source for metrics tracking
        metadata: conversationMetadata
      };

      // Handle streaming vs non-streaming using gateway's conversation methods
      if (request.streaming) {
        // Set up stream handler with the gateway's conversation stream method
        const stream = gateway.conversationStreamChat(request);
        
        // Process the stream (this is asynchronous)
        this.streamHandler.handleStream(
          stream,
          data.connectionId,
          data.userId,
          request.conversationId,
          { timestamp: new Date().toISOString() },
          request // Pass the request for token estimation
        ).catch(error => {
          logger.error('Error handling stream:', error);
        });
        
        // For new conversations, send the ID in a separate message
        if (!data.conversationId) {
          try {
            // We need to know the ID that was generated
            const firstChunk = await stream[Symbol.asyncIterator]().next();
            
            if (firstChunk.value && 'conversationId' in firstChunk.value) {
              const conversationId = firstChunk.value.conversationId;
              
              // Send conversation info message 
              await connectionManager.sendMessage(data.connectionId, {
                type: 'conversation_info',
                data: {
                  conversationId,
                  isNewConversation: true,
                  metadata: {
                    userId: data.userId,
                    timestamp: new Date().toISOString()
                  }
                }
              });
            }
          } catch (error) {
            logger.error('Error getting first chunk of stream:', error);
          }
        }
        
        // Return immediately with processing status
        return {
          type: 'processing',
          data: {
            message: 'Stream processing started',
            metadata: {
              userId: data.userId,
              timestamp: new Date().toISOString(),
              streaming: true
            }
          }
        };
      } else {
        // Handle non-streaming with gateway's conversation chat method
        const response = await gateway.conversationChat(request);
        
        return {
          type: 'chat',
          data: {
            content: response.content,
            conversationId: response.conversationId,
            metadata: {
              ...response.metadata,
              userId: data.userId,
              timestamp: new Date().toISOString()
            }
          }
        };
      }
    } catch (error: any) {
      logger.error('Error in handleLLMConversation:', error);
      throw error;
    }
  }

  /**
   * Legacy handler for the original llm/chat action
   * Routes to either prompt or conversation based on presence of conversationId
   * @param data - The chat request data
   * @returns A response from either prompt or conversation handler
   */
  private async handleLLMChat(data: any): Promise<any> {
    // If conversationId is provided or saveConversation flag is set, treat as conversation
    if (data.conversationId || data.saveConversation) {
      return this.handleLLMConversation(data);
    }
    // Otherwise treat as a stateless prompt
    return this.handleLLMPrompt(data);
  }
}

// Export the handler for Lambda
export const handler = async (event: WebSocketEvent) => {
  return handleWebSocketEvent(event, new LLMChatMessageHandler());
}; 