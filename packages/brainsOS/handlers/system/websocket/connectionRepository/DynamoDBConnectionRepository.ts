import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  DeleteCommand,
  QueryCommand,
  UpdateCommand,
  ScanCommand
} from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';
import { ConnectionRepository, ConnectionData } from './ConnectionRepository';
import { Logger } from '../../../../utils/logging/logger';
import { getDynamoClient, getDocumentClient, getSystemTableName } from '../../../../modules/utils/aws/DynamoClient';

// Initialize logger
const logger = new Logger('DynamoDBConnectionRepository');

/**
 * DynamoDB-based implementation of ConnectionRepository
 * 
 * This class stores connection state in DynamoDB, allowing for persistence
 * across Lambda function invocations.
 */
export class DynamoDBConnectionRepository implements ConnectionRepository {
  private client: DynamoDBDocumentClient;
  private readonly tableName: string;
  private readonly ttlInSeconds: number = 24 * 60 * 60; // 24 hours default TTL

  /**
   * Creates a new DynamoDB connection repository
   * @param ttlInSeconds Optional TTL for connection records (default: 24 hours)
   */
  constructor(ttlInSeconds?: number) {
    // Use the centralized DynamoDB client
    this.client = getDocumentClient();
    
    // Get table name from the resource
    this.tableName = getSystemTableName();
    
    if (!this.tableName) {
      logger.warn('DynamoDB table name not found in Resource, using environment variable');
      this.tableName = process.env.BRAINSOS_SYSTEM_DATA_TABLE_NAME || 'brainsos-system-data';
    }
    
    if (ttlInSeconds) {
      this.ttlInSeconds = ttlInSeconds;
    }
    
    logger.info('Initialized DynamoDB Connection Repository', {
      tableName: this.tableName,
      ttlInSeconds: this.ttlInSeconds
    });
  }

  /**
   * Adds a new connection to the repository
   * @param connectionId The WebSocket connection ID
   * @param userId Optional user ID associated with the connection
   */
  public async addConnection(connectionId: string, userId?: string): Promise<void> {
    try {
      const now = Date.now();
      const expiresAt = Math.floor(now / 1000) + this.ttlInSeconds;
      
      // Use default 'SYSTEM' userId if not provided to satisfy the primary key requirement
      const userIdKey = 'SYSTEM-Connections';
      
      logger.info('Adding connection to DynamoDB', {
        connectionId,
        userIdKey,
        userId
      });
      
      const item: Record<string, any> = {
        userId: userIdKey, // Ensure this is never undefined or null
        typeName: `CONNECTION#${connectionId}`,
        connectionId,
        createdAt: now,
        lastActivity: now,
        expiresAt,
        type: 'connection'
      };
      
      // Double-check that userId is set before sending to DynamoDB
      if (!item.userId) {
        item.userId = 'SYSTEM';
        logger.warn('Forcing userId to SYSTEM as it was undefined', { connectionId });
      }
      
      // Only add the actual userId as a separate property if it's different from the key
      if (userId && userId !== 'SYSTEM') {
        item.actualUserId = userId;
      }
      
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: item
      }));
      
      logger.info('Added connection to DynamoDB', {
        connectionId,
        userId: item.userId,
        expiresAt: new Date(expiresAt * 1000).toISOString()
      });
    } catch (error) {
      logger.error('Failed to add connection to DynamoDB', {
        error: error instanceof Error ? error.message : String(error),
        connectionId,
        userId
      });
      throw error;
    }
  }

  /**
   * Finds a connection by connectionId
   * This is a helper method to find the primary key for a given connectionId
   * @param connectionId The WebSocket connection ID
   * @returns The item if found, undefined otherwise
   * @private
   */
  private async findConnectionByConnectionId(connectionId: string): Promise<Record<string, any> | undefined> {
    // Since we know our typeName pattern, try a direct get first 
    // with the default SYSTEM userId for anonymous connections
    const systemResult = await this.client.send(new GetCommand({
      TableName: this.tableName,
      Key: {
        userId: 'SYSTEM',
        typeName: `CONNECTION#${connectionId}`
      }
    }));
    
    if (systemResult.Item) {
      return systemResult.Item;
    }
    
    // If not found with SYSTEM user, use scan with filter as fallback
    // This is not ideal for performance but necessary without a GSI
    const scanResult = await this.client.send(new ScanCommand({
      TableName: this.tableName,
      FilterExpression: 'connectionId = :connectionId',
      ExpressionAttributeValues: {
        ':connectionId': connectionId
      },
      Limit: 1
    }));
    
    if (scanResult.Items && scanResult.Items.length > 0) {
      return scanResult.Items[0];
    }
    
    return undefined;
  }

  /**
   * Removes a connection from the repository
   * @param connectionId The WebSocket connection ID to remove
   */
  public async removeConnection(connectionId: string): Promise<void> {
    try {
      // Find the connection first to get the primary key
      const connection = await this.findConnectionByConnectionId(connectionId);
      
      if (!connection) {
        logger.warn('No connection found to remove', { connectionId });
        return;
      }
      
      // Delete the connection using the found primary key
      await this.client.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          userId: connection.userId,
          typeName: connection.typeName
        }
      }));
      
      logger.info('Removed connection from DynamoDB', { connectionId });
    } catch (error) {
      logger.error('Failed to remove connection from DynamoDB', {
        error: error instanceof Error ? error.message : String(error),
        connectionId
      });
      throw error;
    }
  }

  /**
   * Checks if a connection exists in the repository
   * @param connectionId The WebSocket connection ID to check
   * @returns true if connection exists, false otherwise
   */
  public async isConnectionActive(connectionId: string): Promise<boolean> {
    try {
      const connection = await this.findConnectionByConnectionId(connectionId);
      return !!connection;
    } catch (error) {
      logger.error('Failed to check connection status in DynamoDB', {
        error: error instanceof Error ? error.message : String(error),
        connectionId
      });
      return false;
    }
  }

  /**
   * Gets all active connection IDs
   * @returns Array of connection IDs
   */
  public async getActiveConnections(): Promise<string[]> {
    try {
      // Scan for all items with type='connection' and extract connectionId
      const result = await this.client.send(new ScanCommand({
        TableName: this.tableName,
        FilterExpression: 'type = :type',
        ExpressionAttributeValues: {
          ':type': 'connection'
        }
      }));
      
      if (!result.Items || result.Items.length === 0) {
        return [];
      }
      
      return result.Items
        .filter(item => item.connectionId)
        .map(item => item.connectionId);
    } catch (error) {
      logger.error('Failed to get active connections from DynamoDB', {
        error: error instanceof Error ? error.message : String(error)
      });
      return [];
    }
  }

  /**
   * Gets connection information by connection ID
   * @param connectionId The WebSocket connection ID
   * @returns Connection data or undefined if not found
   */
  public async getConnection(connectionId: string): Promise<ConnectionData | undefined> {
    try {
      const connection = await this.findConnectionByConnectionId(connectionId);
      
      if (!connection) {
        return undefined;
      }
      
      const { connectionId: id, actualUserId, userId, conversationId, createdAt, lastActivity, metadata } = connection;
      
      return {
        connectionId: id,
        userId: actualUserId || userId,
        conversationId,
        createdAt,
        lastActivity,
        metadata
      };
    } catch (error) {
      logger.error('Failed to get connection from DynamoDB', {
        error: error instanceof Error ? error.message : String(error),
        connectionId
      });
      throw error;
    }
  }

  /**
   * Updates conversation information for a connection
   * @param connectionId The WebSocket connection ID 
   * @param conversationId The conversation ID to associate with this connection
   */
  public async updateConversationMapping(connectionId: string, conversationId: string): Promise<void> {
    try {
      const connection = await this.findConnectionByConnectionId(connectionId);
      
      if (!connection) {
        logger.warn('No connection found to update conversation mapping', { connectionId });
        return;
      }
      
      const now = Date.now();
      
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          userId: connection.userId,
          typeName: connection.typeName
        },
        UpdateExpression: 'SET conversationId = :conversationId, lastActivity = :lastActivity',
        ExpressionAttributeValues: {
          ':conversationId': conversationId,
          ':lastActivity': now
        }
      }));
      
      logger.info('Updated conversation mapping in DynamoDB', {
        connectionId,
        conversationId
      });
    } catch (error) {
      logger.error('Failed to update conversation mapping in DynamoDB', {
        error: error instanceof Error ? error.message : String(error),
        connectionId,
        conversationId
      });
      throw error;
    }
  }

  /**
   * Gets the conversation ID associated with a connection
   * @param connectionId The WebSocket connection ID
   * @returns Conversation ID or undefined if not found
   */
  public async getConversationId(connectionId: string): Promise<string | undefined> {
    try {
      const connection = await this.findConnectionByConnectionId(connectionId);
      return connection?.conversationId;
    } catch (error) {
      logger.error('Failed to get conversation ID from DynamoDB', {
        error: error instanceof Error ? error.message : String(error),
        connectionId
      });
      return undefined;
    }
  }

  /**
   * Updates the last activity timestamp for a connection
   * @param connectionId The WebSocket connection ID
   */
  public async updateLastActivity(connectionId: string): Promise<void> {
    try {
      const connection = await this.findConnectionByConnectionId(connectionId);
      
      if (!connection) {
        logger.warn('No connection found to update last activity', { connectionId });
        return;
      }
      
      const now = Date.now();
      
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          userId: connection.userId,
          typeName: connection.typeName
        },
        UpdateExpression: 'SET lastActivity = :lastActivity',
        ExpressionAttributeValues: {
          ':lastActivity': now
        }
      }));
      
      logger.debug('Updated last activity timestamp', {
        connectionId,
        timestamp: new Date(now).toISOString()
      });
    } catch (error) {
      logger.error('Failed to update last activity timestamp', {
        error: error instanceof Error ? error.message : String(error),
        connectionId
      });
      // Don't throw - this is a non-critical operation
    }
  }
} 