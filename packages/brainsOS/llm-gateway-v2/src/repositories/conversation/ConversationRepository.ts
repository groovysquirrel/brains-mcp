import {
  Conversation,
  CreateConversationOptions,
  AddMessageOptions,
  GetConversationOptions,
  ListConversationsOptions,
  ListConversationsResponse,
  ConversationMessage
} from './ConversationTypes';

/**
 * Interface for conversation repositories
 * Defines methods for storing and retrieving conversation data
 */
export interface ConversationRepository {
  /**
   * Creates a new conversation
   * @param options - Options for creating the conversation
   * @returns The created conversation
   */
  createConversation(options: CreateConversationOptions): Promise<Conversation>;
  
  /**
   * Retrieves a conversation by userId and conversationId
   * @param options - Options for retrieving the conversation
   * @returns The conversation, or null if not found
   */
  getConversation(options: GetConversationOptions): Promise<Conversation | null>;
  
  /**
   * Adds a message to an existing conversation
   * @param options - Options for adding the message
   * @returns The updated conversation
   * @throws Error if the conversation does not exist
   */
  addMessage(options: AddMessageOptions): Promise<Conversation>;
  
  /**
   * Lists conversations for a user
   * @param options - Options for listing conversations
   * @returns A response containing conversations and optional pagination token
   */
  listConversations(options: ListConversationsOptions): Promise<ListConversationsResponse>;
  
  /**
   * Deletes a conversation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @returns true if the conversation was deleted, false if it wasn't found
   */
  deleteConversation(userId: string, conversationId: string): Promise<boolean>;
  
  /**
   * Adds multiple messages to a conversation in a batch operation
   * Useful for importing or migrating conversations
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @param messages - The messages to add
   * @returns The updated conversation
   * @throws Error if the conversation does not exist
   */
  addMessages(userId: string, conversationId: string, messages: ConversationMessage[]): Promise<Conversation>;
  
  /**
   * Checks if a conversation exists
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @returns true if the conversation exists, false otherwise
   */
  conversationExists(userId: string, conversationId: string): Promise<boolean>;
}
