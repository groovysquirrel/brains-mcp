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
 * - Set Data Structure: Used to track active connections
 * - AWS API Gateway: Used for WebSocket communication
 * - Error Handling: Proper error handling for connection issues
 */

import { Logger } from '../../shared/logging/logger';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { Resource } from 'sst';

const logger = new Logger('ConnectionManager');

// Define the structure of a WebSocket message
interface Message {
  type: string;    // Message type (e.g., 'chat', 'error', 'stream')
  data: any;       // Message payload
}

export class ConnectionManager {
  // Singleton instance
  private static instance: ConnectionManager;
  
  // Set of active connection IDs
  private connections: Set<string>;
  
  // AWS API Gateway client for WebSocket communication
  private apiGatewayManagementApi: ApiGatewayManagementApi | null;

  /**
   * Private constructor for singleton pattern.
   * Initializes:
   * 1. Empty connections set
   * 2. API Gateway client with endpoint from environment
   */
  private constructor() {
    this.connections = new Set<string>();
    this.apiGatewayManagementApi = null;
    logger.info('ConnectionManager initialized');
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
      const endpoint = Resource.brainsos_wss.url;
      logger.info('Initializing API Gateway with endpoint:', { endpoint });
      // Remove the wss:// prefix if present and ensure https:// prefix
      const apiEndpoint = endpoint.replace('wss://', '').replace('https://', '');
      const finalEndpoint = `https://${apiEndpoint}`;
      
      logger.info('Using API Gateway endpoint:', { finalEndpoint });
      
      this.apiGatewayManagementApi = new ApiGatewayManagementApi({ 
        endpoint: finalEndpoint,
        region: process.env.AWS_REGION || 'us-east-1'
      });
    } catch (error) {
      logger.error('Failed to initialize API Gateway:', { error });
      throw error;
    }
  }

  /**
   * Adds a new connection to the active connections set.
   * This is called when a new WebSocket connection is established.
   * 
   * @param connectionId - The ID of the new connection
   */
  public addConnection(connectionId: string): void {
    this.connections.add(connectionId);
    logger.info('Added new connection', { 
      connectionId, 
      totalConnections: this.connections.size 
    });
  }

  /**
   * Removes a connection from the active connections set.
   * This is called when a WebSocket connection is closed.
   * 
   * @param connectionId - The ID of the connection to remove
   */
  public removeConnection(connectionId: string): void {
    this.connections.delete(connectionId);
    logger.info('Removed connection', { 
      connectionId, 
      totalConnections: this.connections.size 
    });
  }

  public isConnectionActive(connectionId: string): boolean {
    return this.connections.has(connectionId);
  }

  /**
   * Sends a message to a specific WebSocket connection.
   * This method:
   * 1. Attempts to send the message via API Gateway
   * 2. Handles connection errors (e.g., closed connections)
   * 3. Cleans up invalid connections
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

      if (!this.isConnectionActive(connectionId)) {
        logger.warn('Attempted to send message to inactive connection', { connectionId });
        return;
      }

      logger.info('Sending message to connection', { 
        connectionId, 
        messageType: message.type,
        endpoint: this.apiGatewayManagementApi?.config.endpoint
      });

      await this.apiGatewayManagementApi!.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(message)
      }).promise();

      logger.info('Successfully sent message', { connectionId });
    } catch (error) {
      if (error.statusCode === 410) {
        logger.info('Connection stale, removing', { connectionId });
        this.removeConnection(connectionId);
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
    // Create an array of promises for sending to each connection
    const promises = Array.from(this.connections).map(connectionId =>
      this.sendMessage(connectionId, message).catch(error => {
        // Log errors but don't throw them
        logger.error('Failed to broadcast message', { error, connectionId });
      })
    );
    
    // Wait for all sends to complete
    await Promise.all(promises);
  }
} 