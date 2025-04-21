/**
 * This file implements a connection manager for WebSocket connections.
 * It's responsible for:
 * 1. Managing active WebSocket connections
 * 2. Sending messages to individual connections
 * 3. Broadcasting messages to all connections
 * 4. Handling connection cleanup
 * 
 * Key Concepts:
 * - Singleton Pattern: Ensures only one connection manager instance
 * - DynamoDB Repository: Used for persistent connection storage across Lambda invocations
 * - AWS API Gateway: Used for WebSocket communication
 * - Error Handling: Proper error handling for connection issues
 */

import { Logger } from '../../../shared/Logger';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { Resource } from 'sst';
import { ConnectionRepository } from './connectionRepository/ConnectionRepository';
import { DynamoDBConnectionRepository } from './connectionRepository/DynamoDBConnectionRepository';

// Create logger with configured log level
const logger = new Logger('ConnectionManager', 'warn');

// Define the structure of a WebSocket message
interface Message {
  action: string;    // Message type/action (e.g., 'brain/terminal/response', 'brain/terminal/error')
  data: any;       // Message payload
}

export class ConnectionManager {
  // Singleton instance
  private static instance: ConnectionManager;
  
  // Connection repository for persistent storage
  private connectionRepository: ConnectionRepository;
  
  // AWS API Gateway client for WebSocket communication
  private apiGatewayManagementApi: ApiGatewayManagementApi | null;

  /**
   * Private constructor for singleton pattern.
   * Initializes:
   * 1. Connection repository
   * 2. API Gateway client with endpoint from environment
   */
  private constructor() {
    this.connectionRepository = new DynamoDBConnectionRepository();
    this.apiGatewayManagementApi = null;
    logger.info('ConnectionManager initialized with DynamoDB repository');
  }

  /**
   * Gets the singleton instance of the ConnectionManager.
   * This ensures we only have one connection manager across the application.
   * 
   * @returns The singleton ConnectionManager instance
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  private initializeApiGateway(): void {
    try {
      const endpoint = Resource.brainsOS_wss.url;
      logger.info('Initializing API Gateway with endpoint:', { endpoint });
      
      // Remove the wss:// prefix if present and ensure https:// prefix
      const apiEndpoint = endpoint.replace('wss://', '').replace('https://', '');
      const finalEndpoint = `https://${apiEndpoint}`;
      
      logger.info('Using API Gateway endpoint:', { finalEndpoint });
      
      this.apiGatewayManagementApi = new ApiGatewayManagementApi({ 
        endpoint: finalEndpoint,
        region: process.env.AWS_REGION || 'us-east-1'
      });
      
      logger.info('API Gateway client initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize API Gateway:', { error });
      throw error;
    }
  }

  /**
   * Adds a new connection to the repository.
   * This is called when a new WebSocket connection is established.
   * 
   * @param connectionId - The ID of the new connection
   * @param userId - Optional user ID for the connection
   */
  public async addConnection(connectionId: string, userId?: string): Promise<void> {
    await this.connectionRepository.addConnection(connectionId, userId);
    logger.info('Added new connection', { connectionId, userId });
  }

  /**
   * Removes a connection from the repository.
   * This is called when a WebSocket connection is closed.
   * 
   * @param connectionId - The ID of the connection to remove
   */
  public async removeConnection(connectionId: string): Promise<void> {
    await this.connectionRepository.removeConnection(connectionId);
    logger.info('Removed connection', { connectionId });
  }

  /**
   * Checks if a connection is active by checking the repository and API Gateway.
   * This method attempts to verify an active connection by:
   * 1. First checking the DynamoDB repository for connection state
   * 2. If found, verifying with API Gateway it's still active
   * 
   * @param connectionId - The ID of the connection to check
   * @returns Promise resolving to true if connection is active, false otherwise
   */
  public async isConnectionActive(connectionId: string): Promise<boolean> {
    // First check DynamoDB for connection state
    const isActive = await this.connectionRepository.isConnectionActive(connectionId);
    if (!isActive) {
      logger.debug('Connection not found in repository', { connectionId });
      return false;
    }

    // Now verify with API Gateway
    if (!this.apiGatewayManagementApi) {
      this.initializeApiGateway();
    }
    
    try {
      // Try to get connection info - this will throw if connection is closed
      await this.apiGatewayManagementApi!.getConnection({
        ConnectionId: connectionId
      }).promise();
      
      // Update connection last activity time
      await this.connectionRepository.updateLastActivity(connectionId);
      
      // If we get here, connection is active
      return true;
    } catch (error) {
      if (error.statusCode === 410) {
        // Connection is gone, remove from repository
        logger.info('Connection is stale, removing from repository', { connectionId });
        await this.removeConnection(connectionId);
        return false;
      }
      
      // For other errors, log but assume connection might be active
      logger.warn('Error checking connection status with API Gateway', {
        connectionId,
        error: error.message
      });
      
      // Default to returning the repository state as fallback
      return isActive;
    }
  }

  /**
   * Sends a message to a specific WebSocket connection.
   * This method:
   * 1. Attempts to send the message via API Gateway
   * 2. Handles connection errors (e.g., closed connections)
   * 3. Updates connection activity status on success
   * 
   * @param connectionId - The ID of the connection to send to
   * @param message - The message to send
   * @throws Error if message sending fails
   */
  public async sendMessage(connectionId: string, message: Message): Promise<void> {
    try {
      if (!this.apiGatewayManagementApi) {
        logger.info('API Gateway not initialized, initializing now...');
        this.initializeApiGateway();
      }
      
      logger.info('Sending message to connection', { 
        connectionId, 
        messageType: message.action,
        endpoint: this.apiGatewayManagementApi?.config.endpoint
      });

      await this.apiGatewayManagementApi!.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(message)
      }).promise();

      // Update last activity timestamp on success
      await this.connectionRepository.updateLastActivity(connectionId);
      
      logger.info('Successfully sent message', { connectionId });
    } catch (error) {
      if (error.statusCode === 410) {
        logger.info('Connection stale, removing', { connectionId });
        await this.removeConnection(connectionId);
      } else {
        logger.error('Failed to send message', { 
          error,
          connectionId,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        });
        throw error;
      }
    }
  }

  /**
   * Broadcasts a message to all active connections.
   * This is useful for:
   * 1. System announcements
   * 2. Global updates
   * 3. Notifications to all connected clients
   * 
   * @param message - The message to broadcast
   */
  public async broadcast(message: Message): Promise<void> {
    // Get all active connections from the repository
    const connectionIds = await this.connectionRepository.getActiveConnections();
    
    logger.info('Broadcasting message to connections', { 
      connectionCount: connectionIds.length,
      messageType: message.action
    });
    
    // Create an array of promises for sending to each connection
    const promises = connectionIds.map(connectionId =>
      this.sendMessage(connectionId, message).catch(error => {
        // Log errors but don't throw them
        logger.error('Failed to broadcast message to connection', { error, connectionId });
      })
    );
    
    // Wait for all sends to complete
    await Promise.all(promises);
  }

  /**
   * Updates conversation mapping for a connection
   * This helps track which conversation is associated with which connection
   * 
   * @param connectionId - The WebSocket connection ID
   * @param conversationId - The conversation ID to associate
   */
  public async updateConversationMapping(connectionId: string, conversationId: string): Promise<void> {
    await this.connectionRepository.updateConversationMapping(connectionId, conversationId);
    logger.info('Updated conversation mapping', { connectionId, conversationId });
  }

  /**
   * Gets the conversation ID for a connection
   * 
   * @param connectionId - The WebSocket connection ID
   * @returns The associated conversation ID, or undefined if not found
   */
  public async getConversationId(connectionId: string): Promise<string | undefined> {
    return this.connectionRepository.getConversationId(connectionId);
  }

  /**
   * Broadcasts a message to all connections in a specific conversation.
   * This is useful for:
   * 1. Sending updates to all clients in a conversation
   * 2. Notifying all participants of events in a conversation
   * 
   * @param conversationId - The ID of the conversation to broadcast to
   * @param message - The message to broadcast
   */
  public async broadcastToConversation(conversationId: string, message: Message): Promise<void> {
    // Get all connections for this conversation
    const connectionIds = await this.connectionRepository.getConnectionsByConversation(conversationId);
    
    if (connectionIds.length === 0) {
      logger.info('No active connections found for conversation', { conversationId });
      return;
    }
    
    logger.info('Broadcasting message to conversation connections', { 
      connectionCount: connectionIds.length,
      conversationId,
      messageType: message.action
    });
    
    // Create an array of promises for sending to each connection
    const promises = connectionIds.map(connectionId =>
      this.sendMessage(connectionId, message).catch(error => {
        // Log errors but don't throw them
        logger.error('Failed to broadcast message to connection in conversation', { 
          error, 
          connectionId,
          conversationId 
        });
      })
    );
    
    // Wait for all sends to complete
    await Promise.all(promises);
  }
} 