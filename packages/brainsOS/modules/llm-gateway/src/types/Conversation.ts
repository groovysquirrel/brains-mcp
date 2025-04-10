/**
 * Represents a message in a conversation
 */
export interface ConversationMessage {
  role: string;         // 'user', 'assistant', or 'system'
  content: string;      // The actual message content
  timestamp: number;    // Unix timestamp in milliseconds
  metadata?: Record<string, any>; // Optional metadata
}

/**
 * Represents a conversation
 */
export interface Conversation {
  userId: string;           // User identifier
  conversationId: string;   // Unique conversation identifier
  messages: ConversationMessage[]; // Array of messages in this conversation
  metadata?: Record<string, any>; // Optional metadata for the conversation
  created: number;          // Creation timestamp (Unix ms)
  updated: number;          // Last updated timestamp (Unix ms)
}

/**
 * Options for creating a conversation
 */
export interface CreateConversationOptions {
  userId: string;
  conversationId?: string;  // Optional - will be generated if not provided
  initialMessages?: ConversationMessage[]; // Optional initial messages
  metadata?: Record<string, any>; // Optional metadata
}

/**
 * Options for adding a message to a conversation
 */
export interface AddMessageOptions {
  userId: string;
  conversationId: string;
  message: ConversationMessage;
}

/**
 * Options for retrieving a conversation
 */
export interface GetConversationOptions {
  userId: string;
  conversationId: string;
  limit?: number;          // Optional limit on number of messages
}

/**
 * Options for listing conversations
 */
export interface ListConversationsOptions {
  userId: string;
  limit?: number;          // Optional limit on number of conversations
  nextToken?: string;      // Optional pagination token
}

/**
 * Response for listing conversations
 */
export interface ListConversationsResponse {
  conversations: Conversation[];
  nextToken?: string;      // Pagination token for getting next page
} 