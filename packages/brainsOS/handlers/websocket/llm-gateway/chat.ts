import { Logger } from '../../shared/logging/logger';
import { LLMGateway } from '../../../llm-gateway/llmGateway';
import { ChatRequest, ModelConfig, Message, ModelId, WebSocketMessage } from '../../../llm-gateway/types';
import { WebSocketEvent } from '../types/websocketTypes';
import { conversationRepository } from '../../../system/repositories/conversation/conversationRepository';
import { ConfigLoader } from '../../../llm-gateway/config/configLoader';
import { ChatRequestSchema } from '../../../llm-gateway/config/schemas';
import { ConnectionManager } from './connectionManager';
import { StreamHandler } from './streamHandler';
import { BedrockModelValidator } from '../../../llm-gateway/providers/bedrock/modelValidator';

const logger = new Logger('LLMGatewayChat');
const connectionManager = ConnectionManager.getInstance();
const streamHandler = new StreamHandler();

// Global state for LLM Gateway
let llmGateway: LLMGateway;

/**
 * Initializes the LLM Gateway with provider configurations.
 * This function sets up the gateway with the necessary configurations
 * and ensures it's ready to handle requests.
 * 
 * @throws {Error} If initialization fails
 */
const initializeGateway = async () => {
  try {
    const configLoader = ConfigLoader.getInstance();
    const config = configLoader.getLLMGatewayConfig();

    llmGateway = new LLMGateway(config);
    await llmGateway.initialize();

    logger.info('Successfully initialized LLM Gateway', {
      region: process.env.AWS_REGION || 'us-east-1',
      hasLLMGateway: !!llmGateway
    });
  } catch (error) {
    logger.error('Failed to initialize LLM Gateway:', {
      error,
      stack: error.stack,
      region: process.env.AWS_REGION || 'us-east-1'
    });
    throw error;
  }
};

// Initialize gateway immediately and ensure it's ready before handling requests
let initializationPromise: Promise<void>;

/**
 * Ensures the LLM Gateway is initialized before handling any requests.
 * Uses a singleton pattern to prevent multiple initializations.
 */
const ensureInitialized = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeGateway();
  }
  return initializationPromise;
};

// Initialize gateway immediately
initializationPromise = initializeGateway().catch(error => {
  logger.error('Failed to initialize gateway:', error);
  throw error;
});

/**
 * Main handler for LLM chat requests.
 * This function processes incoming WebSocket messages for chat functionality,
 * supporting both streaming and non-streaming responses.
 * 
 * Key responsibilities:
 * 1. Validates incoming requests
 * 2. Initializes the LLM Gateway if needed
 * 3. Processes chat requests (streaming and non-streaming)
 * 4. Handles errors and connection management
 * 5. Manages conversation history
 * 
 * @param event - WebSocket event containing the chat request
 * @returns Response object with appropriate status code and body
 */
export const handler = async (event: WebSocketEvent) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.requestContext.authorizer?.userId;

  connectionManager.addConnection(connectionId);

  logger.info('Processing LLM request', {
    connectionId,
    userId,
    body: event.body
  });

  try {
    await ensureInitialized();

    // Parse and validate the incoming request
    const body = JSON.parse(event.body || '{}');
    const validatedRequest = ChatRequestSchema.parse(body);
    const { data } = validatedRequest;
    
    // Extract request parameters with defaults
    const {
      messages,
      modelId = 'anthropic.claude-3-sonnet-20240229-v1:0',
      stream = false,
      systemPrompt,
      metadata,
      maxTokens,
      temperature,
      conversationId
    } = data;

    // Validate model capabilities before proceeding
    try {
      BedrockModelValidator.validateModelCapabilities(modelId, {
        supportsStreaming: stream,
        inputModalities: ['text'],
        outputModalities: ['text']
      });
      logger.info('Model capabilities validated', { modelId, stream });
    } catch (error) {
      logger.error('Model validation failed:', { error, modelId, stream });
      throw error;
    }

    // Determine provider and create model configuration
    const modelConfig: ModelConfig = {
      provider: modelId.startsWith('anthropic.') || modelId.startsWith('meta.') || modelId.startsWith('mistral.') ? 'bedrock' :
                modelId.startsWith('gpt-') ? 'openai' :
                modelId.startsWith('claude-') ? 'anthropic' :
                'bedrock',
      modelId,
      maxTokens,
      temperature
    };

    // Prepare chat request with metadata
    const chatRequest: ChatRequest = {
      messages: messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      modelConfig,
      systemPrompt,
      metadata: {
        ...metadata,
        userId,
        connectionId,
        timestamp: new Date().toISOString(),
        conversationId
      }
    };

    logger.info('Starting LLM request', {
      modelId,
      stream,
      userId,
      connectionId,
      conversationId
    });

    // Handle streaming response
    if (stream) {
      if (!connectionManager.isConnectionActive(connectionId)) {
        logger.warn('Connection closed before stream started', { connectionId });
        return {
          statusCode: 410,
          body: JSON.stringify({
            success: false,
            error: {
              code: 'CONNECTION_CLOSED',
              message: 'Connection was closed before stream could start'
            }
          })
        };
      }

      const stream = llmGateway.streamChat(chatRequest);
      await streamHandler.handleStream(stream, connectionId, userId, conversationId, metadata);

      return {
        statusCode: 200,
        body: 'Stream completed'
      };
    } 
    
    // Handle non-streaming response
    const response = await llmGateway.chat(chatRequest);
    
    const message: Message = {
      role: 'assistant',
      content: response.content
    };

    // Store conversation history if conversationId is provided
    if (conversationId) {
      const repo = conversationRepository.getInstance();
      await repo.addToConversation(userId, conversationId, [message]);
    }

    // Send response to client
    await connectionManager.sendToClient(connectionId, {
      type: 'chat',
      content: response.content,
      usage: response.usage,
      metadata: response.metadata,
      timestamp: new Date().toISOString()
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        metadata: {
          connectionId,
          userId,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    // Handle errors and send error response to client
    logger.error('Error in LLM handler:', {
      error,
      connectionId,
      userId,
      stack: error.stack
    });

    if (connectionManager.isConnectionActive(connectionId)) {
      await connectionManager.sendToClient(connectionId, {
        type: 'error',
        message: error.message || 'Failed to process LLM request',
        timestamp: new Date().toISOString()
      });
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'LLM_ERROR',
          message: error.message || 'Failed to process LLM request'
        },
        metadata: {
          connectionId,
          userId,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};