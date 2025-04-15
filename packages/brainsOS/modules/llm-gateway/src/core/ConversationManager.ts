import { Logger } from '../../../utils/logging/Logger';
import { ConversationRepository } from '../repositories/conversation/ConversationRepository';
import { DynamoConversationRepository } from '../repositories/conversation/DynamoConversationRepository';
import { ConversationMessage, Conversation, ListConversationsResponse } from '../types/Conversation';
import { GatewayRequest } from '../types/Request';
import { GatewayResponse } from '../types/Response';
import { v4 as uuidv4 } from 'uuid';

// Re-export types from conversation repository for external use
export type { ConversationMessage, Conversation, ListConversationsResponse };

/**
 * ConversationOptions interface for creating/managing conversations
 */
export interface ConversationOptions {
  userId: string;
  conversationId?: string;  // If not provided, a new one will be generated
  title?: string;
  metadata?: Record<string, any>;
}

/**
 * Extend the GatewayResponse type to include conversationId
 */
export interface ConversationGatewayResponse extends GatewayResponse {
  conversationId: string;
}

/**
 * Module for handling conversation-related operations
 * Uses a singleton pattern for optimized Lambda execution
 */

// Global variables for Lambda reuse
let conversationRepositoryInstance: ConversationRepository | undefined;
const logger = new Logger('ConversationManager');

/**
 * Initialize the conversation repository
 */
export const initializeConversationManager = (repository?: ConversationRepository): void => {
  conversationRepositoryInstance = repository || new DynamoConversationRepository();
  logger.info('Conversation manager initialized');
};

/**
 * Get the conversation repository instance
 */
export const getConversationRepository = (): ConversationRepository => {
  if (!conversationRepositoryInstance) {
    logger.info('Creating default conversation repository');
    conversationRepositoryInstance = new DynamoConversationRepository();
  }
  return conversationRepositoryInstance;
};

/**
 * Load conversation history and add it to the request
 */
export const loadConversationHistory = async (request: GatewayRequest): Promise<GatewayRequest> => {
  const { conversationId, userId } = request;
  
  // If no conversation ID or user ID, return the request as is
  if (!conversationId || !userId) {
    return request;
  }
  
  try {
    const repository = getConversationRepository();
    
    // Load the conversation
    const conversation = await repository.getConversation({
      userId,
      conversationId
    });
    
    // If conversation not found, return the request as is
    if (!conversation) {
      return request;
    }
    
    // Convert the conversation messages to the format expected by the LLM
    const historyMessages = conversation.messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Combine the history with the current message
    if (request.messages && request.messages.length > 0) {
      // When we have messages array, we need to ensure proper alternation
      const lastHistoryMessage = historyMessages.length > 0 
        ? historyMessages[historyMessages.length - 1] 
        : null;
      
      // Get the first new message
      const firstNewMessage = request.messages[0];
      
      // Check if we'd have consecutive messages with the same role
      if (lastHistoryMessage && lastHistoryMessage.role === firstNewMessage.role) {
        // We need to prevent role alternation issues
        logger.warn('Preventing message alternation issue in conversation history', {
          lastHistoryRole: lastHistoryMessage.role,
          firstNewRole: firstNewMessage.role,
          conversationId
        });
        
        // If both are user messages, we can combine them or use just the new one
        if (firstNewMessage.role === 'user') {
          // For user messages, use only the new message and discard history
          // This avoids having two consecutive user messages
          return request;
        }
      }
      
      // Combine history with new messages
      return {
        ...request,
        messages: [...historyMessages, ...request.messages]
      };
    } else if (request.prompt) {
      // When we have a prompt (legacy), create a new message array
      // Check for alternation issues here too
      const lastHistoryMessage = historyMessages.length > 0 
        ? historyMessages[historyMessages.length - 1] 
        : null;
      
      // If last history message is also from user, skip history
      if (lastHistoryMessage && lastHistoryMessage.role === 'user') {
        return {
          ...request,
          messages: [{ role: 'user', content: request.prompt }],
          prompt: undefined
        };
      }
      
      return {
        ...request,
        messages: [
          ...historyMessages,
          { role: 'user', content: request.prompt }
        ],
        // Remove the prompt to avoid confusion
        prompt: undefined
      };
    } else {
      // No messages or prompt, just use the history
      return {
        ...request,
        messages: historyMessages
      };
    }
  } catch (error: any) {
    logger.error('Failed to load conversation history', {
      error,
      userId,
      conversationId
    });
    
    // If there's an error loading the history, continue with the original request
    return request;
  }
};

/**
 * Save a chat exchange to the conversation repository
 */
export const saveConversationExchange = async (
  request: GatewayRequest, 
  response: GatewayResponse
): Promise<void> => {
  const { conversationId, userId } = request;
  
  // If no conversation tracking info provided, don't save
  if (!conversationId || !userId) {
    return;
  }
  
  try {
    const repository = getConversationRepository();
    
    // Check if this is a new or existing conversation
    const exists = await repository.conversationExists(userId, conversationId);
    
    // Messages to save (request and response)
    const messages: ConversationMessage[] = [];
    
    // Add user message
    if (request.messages && request.messages.length > 0) {
      // Get the last message from the user (the most recent one)
      const userMessage = request.messages[request.messages.length - 1];
      messages.push({
        role: userMessage.role,
        content: userMessage.content,
        timestamp: Date.now()
      });
    } else if (request.prompt) {
      // Handle legacy prompt
      messages.push({
        role: 'user',
        content: request.prompt,
        timestamp: Date.now()
      });
    }
    
    // Add assistant response
    messages.push({
      role: 'assistant',
      content: response.content,
      timestamp: Date.now(),
      metadata: response.metadata
    });
    
    if (exists) {
      // Add messages to existing conversation
      await repository.addMessages(userId, conversationId, messages);
    } else {
      // Create new conversation
      await repository.createConversation({
        userId,
        conversationId,
        initialMessages: messages,
        metadata: request.metadata as Record<string, any>
      });
    }
    
    logger.info('Saved conversation exchange', { userId, conversationId });
  } catch (error: any) {
    logger.error('Failed to save conversation exchange', {
      error,
      userId,
      conversationId
    });
    // Continue execution even if saving fails
  }
};

/**
 * Creates a new conversation
 */
export const createConversation = async (
  options: ConversationOptions
): Promise<{ conversationId: string; isNew: boolean }> => {
  const repository = getConversationRepository();
  const { userId, conversationId = uuidv4(), title, metadata = {} } = options;
  
  // Check if conversation already exists
  const exists = await repository.conversationExists(userId, conversationId);
  
  if (!exists) {
    // Create new conversation
    await repository.createConversation({
      userId,
      conversationId,
      metadata: {
        title: title || 'New Conversation',
        createdAt: Date.now(),
        ...metadata
      }
    });
  }
  
  return {
    conversationId,
    isNew: !exists
  };
};

/**
 * Retrieves a conversation
 */
export const getConversation = async (
  userId: string, 
  conversationId: string
): Promise<Conversation | null> => {
  const repository = getConversationRepository();
  return repository.getConversation({
    userId,
    conversationId
  });
};

/**
 * Lists conversations for a user
 */
export const listConversations = async (
  userId: string, 
  limit?: number, 
  nextToken?: string
): Promise<ListConversationsResponse> => {
  const repository = getConversationRepository();
  return repository.listConversations({
    userId,
    limit,
    nextToken
  });
};

/**
 * Deletes a conversation
 */
export const deleteConversation = async (
  userId: string, 
  conversationId: string
): Promise<boolean> => {
  const repository = getConversationRepository();
  return repository.deleteConversation(userId, conversationId);
};

/**
 * Adds a message to a conversation
 */
export const addMessageToConversation = async (
  userId: string,
  conversationId: string,
  message: ConversationMessage
): Promise<Conversation> => {
  const repository = getConversationRepository();
  return repository.addMessage({
    userId,
    conversationId,
    message
  });
}; 