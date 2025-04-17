/**
 * This file implements an API handler for the LLM Gateway.
 * It's responsible for:
 * 1. Processing HTTP API requests to the LLM Gateway
 * 2. Handling both stateless prompts and stateful conversations
 * 3. Providing responses in JSON format
 * 
 * Key Concepts:
 * - REST API: Stateless HTTP requests/responses
 * - Singleton Pattern: Used for Gateway to ensure a single instance
 * - JSON Serialization: All requests and responses are JSON formatted
 * - Error Handling: Comprehensive error handling with proper logging and HTTP status codes
 */

import { Logger } from '../../../utils/logging/logger';
import { Gateway, ConversationOptions } from '../../../modules/llm-gateway/src/Gateway';
import { GatewayRequest } from '../../../modules/llm-gateway/src/types/Request';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { extractUserId as extractUserIdFromAuth, requireUserId } from '../../auth/authUtils';

// Initialize logging
const logger = new Logger('LLMGatewayAPIHandler');

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
    logger.info('Initializing Gateway');

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

// Initialize BedrockClient with the same region as Gateway (add near other initializations)
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
 * Creates a standardized API response
 * @param statusCode HTTP status code
 * @param body Response body
 * @returns Formatted API Gateway response
 */
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body)
  };
};

/**
 * Extracts and validates the user ID from the request
 * @param event API Gateway event
 * @returns User ID or throws error if not found
 */
const extractUserId = (event: APIGatewayProxyEvent): string => {
  try {
    // Use the central auth utility function
    const userId = extractUserIdFromAuth(event, logger);
    
    if (!userId) {
      logger.warn('No user ID found in request');
      throw new Error('Valid non-empty user ID is required. Authentication required or provide a non-empty userId.');
    }
    
    logger.info('Extracted user ID', { userId });
    return userId;
  } catch (error) {
    logger.error('Failed to extract valid user ID', { error });
    throw new Error('Valid non-empty user ID is required. Authentication required or provide a non-empty userId.');
  }
};

/**
 * Verifies that the userId is present and valid in the request
 * This ensures proper accounting for all API operations
 * @param body - The parsed request body 
 * @param extractedUserId - The userId extracted from authentication
 * @returns A valid userId or throws an error
 */
const ensureValidUserId = (body: any, extractedUserId: string): string => {
  // Only trust the user ID from the token, never from the request body
  // Also explicitly check for empty strings
  if (extractedUserId && extractedUserId.trim() !== '') {
    // If body has userId property, replace it with the authenticated userId
    // This ensures the Gateway gets the correct userId for accounting
    if ('userId' in body) {
      // If userId in body doesn't match the token, log a warning (potential impersonation attempt)
      if (body.userId && body.userId !== extractedUserId) {
        logger.warn('Attempted impersonation detected - userId in request body does not match token', {
          tokenUserId: extractedUserId,
          bodyUserId: body.userId
        });
      }
      
      // Always override with the authenticated userId
      body.userId = extractedUserId;
    }
    
    logger.info('Using userId from authentication token', { userId: extractedUserId });
    return extractedUserId;
  }
  
  // No valid userId found from token or userId is an empty string
  throw new Error('Authentication required. A valid token with user identity is required for API operations.');
};

/**
 * Handles prompt requests to the LLM Gateway
 * @param event API Gateway event
 * @returns API Gateway response
 */
const handlePrompt = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID from authentication
    const extractedUserId = extractUserId(event);
    const body = JSON.parse(event.body || '{}');
    
    // Ensure we have a valid userId for accounting
    const userId = ensureValidUserId(body, extractedUserId);
    
    logger.info('Processing prompt request', { userId });
    
    // Create request object without conversation tracking
    const request: GatewayRequest = {
      provider: body.provider || 'bedrock',
      modelId: body.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0',
      messages: body.messages || [],
      prompt: body.prompt,
      modality: body.modality || 'text-to-text',
      streaming: false, // API doesn't support streaming
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      systemPrompt: body.systemPrompt,
      userId, // Ensure userId is always set for accounting
      source: 'api', // Set source for metrics tracking
      metadata: {
        ...body.metadata,
        userId,
        source: 'api',
        timestamp: new Date().toISOString()
      }
    };
    
    // Process the request
    const response = await gateway.chat(request);
    
    return createResponse(200, {
      content: response.content,
      metadata: {
        ...response.metadata,
        userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Error handling prompt request:', error);
    return createResponse(500, {
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
};

/**
 * Handles conversation requests to the LLM Gateway
 * @param event API Gateway event
 * @returns API Gateway response
 */
const handleConversation = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID from authentication
    const extractedUserId = extractUserId(event);
    const body = JSON.parse(event.body || '{}');
    
    // Ensure we have a valid userId for accounting
    const userId = ensureValidUserId(body, extractedUserId);
    
    logger.info('Processing conversation request', { 
      userId, 
      conversationId: body.conversationId
    });
    
    // Extract title and tags for conversation metadata
    const { title, tags } = body;
    
    // Prepare conversation metadata
    const conversationMetadata = {
      ...(body.metadata || {}),
      userId,
      source: 'api',
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
      provider: body.provider || 'bedrock',
      modelId: body.modelId || 'anthropic.claude-3-sonnet-20240229-v1:0',
      messages: body.messages || [],
      prompt: body.prompt,
      modality: body.modality || 'text-to-text',
      streaming: false, // API doesn't support streaming
      maxTokens: body.maxTokens,
      temperature: body.temperature,
      systemPrompt: body.systemPrompt,
      // Add conversation tracking data
      userId, // Always use validated userId
      source: 'api', // Set source for metrics tracking
      conversationId: body.conversationId,
      title: body.title,
      metadata: conversationMetadata
    };
    
    // Process the request
    const response = await gateway.conversationChat(request);
    
    return createResponse(200, {
      content: response.content,
      conversationId: response.conversationId,
      metadata: {
        ...response.metadata,
        userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error: any) {
    logger.error('Error handling conversation request:', error);
    return createResponse(500, {
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
};

/**
 * Handles conversation management operations
 * @param event API Gateway event
 * @param action The management action (list, get, delete)
 * @returns API Gateway response
 */
const handleConversationManagement = async (
  event: APIGatewayProxyEvent, 
  action: string
): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID from authentication
    const extractedUserId = extractUserId(event);
    const params = event.queryStringParameters || {};
    const body = JSON.parse(event.body || '{}');
    
    // Ensure we have a valid userId for accounting
    const userId = ensureValidUserId(body, extractedUserId);
    
    // Extra validation to prevent empty userIds from causing database errors
    if (!userId || userId.trim() === '') {
      logger.error('Empty userId detected in conversation management', { action });
      return createResponse(400, {
        error: 'Valid user ID is required.',
        code: 'INVALID_USER_ID'
      });
    }
    
    switch (action) {
      case 'list': {
        logger.info('Listing conversations', { userId });
        const limit = params.limit ? parseInt(params.limit, 10) : undefined;
        const result = await gateway.listConversations(userId, limit, params.nextToken);
        return createResponse(200, result);
      }
        
      case 'get': {
        const conversationId = params.conversationId || body.conversationId;
        if (!conversationId) {
          return createResponse(400, {
            error: 'Missing required parameter: conversationId',
            code: 'MISSING_PARAMETER'
          });
        }
        
        logger.info('Getting conversation', { userId, conversationId });
        const conversation = await gateway.getConversation(userId, conversationId);
        
        if (!conversation) {
          return createResponse(404, {
            error: 'Conversation not found',
            code: 'CONVERSATION_NOT_FOUND'
          });
        }
        
        return createResponse(200, conversation);
      }
        
      case 'delete': {
        const conversationId = params.conversationId || body.conversationId;
        if (!conversationId) {
          return createResponse(400, {
            error: 'Missing required parameter: conversationId',
            code: 'MISSING_PARAMETER'
          });
        }
        
        logger.info('Deleting conversation', { userId, conversationId });
        const deleted = await gateway.deleteConversation(userId, conversationId);
        
        if (!deleted) {
          return createResponse(404, {
            error: 'Conversation not found',
            code: 'CONVERSATION_NOT_FOUND'
          });
        }
        
        return createResponse(200, { success: true });
      }
        
      default:
        return createResponse(400, {
          error: `Unsupported conversation management action: ${action}`,
          code: 'UNSUPPORTED_ACTION'
        });
    }
  } catch (error: any) {
    logger.error('Error handling conversation management:', error);
    return createResponse(500, {
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
};

/**
 * Main Lambda handler for processing API Gateway requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Ensure gateway is initialized
    await ensureInitialized();
    
    // Extract action from path parameter
    const action = event.pathParameters?.action || '';
    
    logger.info('Received request', {
      action,
      path: event.path,
      method: event.httpMethod
    });
    
    // Route request based on action
    switch (action) {
      case 'prompt':
        return handlePrompt(event);
        
      case 'conversation':
        return handleConversation(event);
        
      case 'list-conversations':
        return handleConversationManagement(event, 'list');
        
      case 'get-conversation':
        return handleConversationManagement(event, 'get');
        
      case 'delete-conversation':
        return handleConversationManagement(event, 'delete');
        
      default:
        return createResponse(400, {
          error: `Unsupported action: ${action}`,
          code: 'UNSUPPORTED_ACTION'
        });
    }
  } catch (error: any) {
    logger.error('Error processing request:', error);
    return createResponse(500, {
      error: error.message || 'Internal server error',
      code: error.code || 'INTERNAL_ERROR'
    });
  }
};
