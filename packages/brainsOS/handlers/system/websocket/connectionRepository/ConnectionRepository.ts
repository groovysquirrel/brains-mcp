/**
 * Interface defining the Connection Repository functionality
 * 
 * This repository is responsible for persistent storage of connection 
 * information, allowing stateless Lambda functions to share connection state.
 */
export interface ConnectionRepository {
  /**
   * Adds a new connection to the repository
   * @param connectionId The WebSocket connection ID
   * @param userId Optional user ID associated with the connection
   * @returns Promise resolving when connection is stored
   */
  addConnection(connectionId: string, userId?: string): Promise<void>;
  
  /**
   * Removes a connection from the repository
   * @param connectionId The WebSocket connection ID to remove
   * @returns Promise resolving when connection is removed
   */
  removeConnection(connectionId: string): Promise<void>;
  
  /**
   * Checks if a connection exists in the repository
   * @param connectionId The WebSocket connection ID to check
   * @returns Promise resolving to true if connection exists, false otherwise
   */
  isConnectionActive(connectionId: string): Promise<boolean>;
  
  /**
   * Gets all active connection IDs
   * @returns Promise resolving to array of connection IDs
   */
  getActiveConnections(): Promise<string[]>;
  
  /**
   * Gets connection information by connection ID
   * @param connectionId The WebSocket connection ID
   * @returns Promise resolving to connection data or undefined if not found
   */
  getConnection(connectionId: string): Promise<ConnectionData | undefined>;
  
  /**
   * Updates conversation information for a connection
   * @param connectionId The WebSocket connection ID 
   * @param conversationId The conversation ID to associate with this connection
   * @returns Promise resolving when mapping is updated
   */
  updateConversationMapping(connectionId: string, conversationId: string): Promise<void>;
  
  /**
   * Gets the conversation ID associated with a connection
   * @param connectionId The WebSocket connection ID
   * @returns Promise resolving to conversation ID or undefined if not found
   */
  getConversationId(connectionId: string): Promise<string | undefined>;
  
  /**
   * Updates the last activity timestamp for a connection
   * @param connectionId The WebSocket connection ID
   * @returns Promise resolving when timestamp is updated
   */
  updateLastActivity(connectionId: string): Promise<void>;
}

/**
 * Connection data stored in the repository
 */
export interface ConnectionData {
  connectionId: string;
  userId?: string;
  conversationId?: string;
  createdAt: number; // Timestamp
  lastActivity: number; // Timestamp
  metadata?: Record<string, any>; // Additional contextual information
} 