import { Logger } from '../../shared/logging/logger';
import { ApiGatewayManagementApi } from 'aws-sdk';
import { Resource } from 'sst';
import { WebSocketMessage } from '../../../llm-gateway/types';

const logger = new Logger('WebSocketConnectionManager');

/**
 * Manages WebSocket connections and message sending for the LLM Gateway.
 * This class uses the Singleton pattern to ensure only one instance manages all connections.
 * 
 * Key responsibilities:
 * 1. Track active WebSocket connections
 * 2. Send messages to connected clients
 * 3. Handle connection cleanup when clients disconnect
 */
export class ConnectionManager {
  private static instance: ConnectionManager;
  private activeConnections: Set<string>;
  private apiGatewayManagementApi: ApiGatewayManagementApi;

  private constructor() {
    this.activeConnections = new Set<string>();
    this.apiGatewayManagementApi = this.initializeApiGateway();
  }

  /**
   * Gets the singleton instance of ConnectionManager.
   * This ensures we're using the same connection tracking across the application.
   */
  public static getInstance(): ConnectionManager {
    if (!ConnectionManager.instance) {
      ConnectionManager.instance = new ConnectionManager();
    }
    return ConnectionManager.instance;
  }

  /**
   * Initializes the AWS API Gateway Management API client.
   * This client is used to send messages to WebSocket connections.
   */
  private initializeApiGateway(): ApiGatewayManagementApi {
    const endpoint = Resource.brains_websocket_api_latest.url;
    if (!endpoint) {
      throw new Error('WEBSOCKET_API_ENDPOINT environment variable is not set');
    }

    const apiEndpoint = endpoint.replace('wss://', 'https://');
    return new ApiGatewayManagementApi({ endpoint: apiEndpoint });
  }

  /**
   * Adds a new connection to the active connections set.
   * This should be called when a client first connects.
   */
  public addConnection(connectionId: string): void {
    this.activeConnections.add(connectionId);
    logger.debug('New connection added', { connectionId });
  }

  /**
   * Removes a connection from the active connections set.
   * This should be called when a client disconnects or the connection is closed.
   */
  public removeConnection(connectionId: string): void {
    this.activeConnections.delete(connectionId);
    logger.debug('Connection removed', { connectionId });
  }

  /**
   * Checks if a connection is currently active.
   * This is used before attempting to send messages to a client.
   */
  public isConnectionActive(connectionId: string): boolean {
    return this.activeConnections.has(connectionId);
  }

  /**
   * Sends a message to a specific WebSocket client.
   * If the connection is closed or stale, the message will be skipped.
   * 
   * @param connectionId - The ID of the client to send the message to
   * @param data - The message data to send
   */
  public async sendToClient(connectionId: string, data: WebSocketMessage): Promise<void> {
    if (!this.isConnectionActive(connectionId)) {
      logger.debug('Skipping message to stale connection', { connectionId });
      return;
    }

    try {
      await this.apiGatewayManagementApi.postToConnection({
        ConnectionId: connectionId,
        Data: JSON.stringify(data)
      }).promise();
    } catch (error) {
      await this.handleSendError(error, connectionId);
    }
  }

  /**
   * Handles errors that occur when sending messages to clients.
   * If the error indicates a closed connection (410), the connection is removed.
   * Other errors are logged and rethrown.
   */
  private async handleSendError(error: any, connectionId: string): Promise<void> {
    if (error.statusCode === 410) {
      this.removeConnection(connectionId);
      logger.warn('Connection closed by client', { connectionId });
    } else {
      logger.error('Error sending message to client', {
        error,
        connectionId,
        endpoint: this.apiGatewayManagementApi.endpoint
      });
      throw error;
    }
  }
} 