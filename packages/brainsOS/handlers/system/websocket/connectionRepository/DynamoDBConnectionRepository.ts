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
import { Logger } from '../../../../shared/Logger';
import { getDynamoClient, getDocumentClient, getSystemTableName } from '../../../../modules/utils/aws/DynamoClient';

// Initialize logger
const logger = new Logger('ConnectionRepository.DynamoDB', 'warn');

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
   * Finds a connection by connectionId
   * This is a helper method to find the primary key for a given connectionId
   * @param connectionId The WebSocket connection ID
   * @returns The item if found, undefined otherwise
   * @private
   */
  private async findConnectionByConnectionId(connectionId: string): Promise<Record<string, any> | undefined> {
    // Always use SYSTEM as the userId for consistency
    const userIdKey = 'SYSTEM-Connections';
    const typeNameKey = `CONNECTION#${connectionId}`;
    
    try {
      const result = await this.client.send(new GetCommand({
        TableName: this.tableName,
        Key: {
          userId: userIdKey,
          typeName: typeNameKey
        }
      }));
      
      return result.Item;
    } catch (error) {
      logger.error('Error finding connection by connectionId', {
        error: error instanceof Error ? error.message : String(error),
        connectionId
      });
      return undefined;
    }
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
      
      // Always use SYSTEM-Connections as the userIdKey for consistent storage
      const userIdKey = 'SYSTEM-Connections';
      const typeNameKey = `CONNECTION#${connectionId}`;
      
      // Check if connection already exists
      const existingConnection = await this.findConnectionByConnectionId(connectionId);
      if (existingConnection) {
        logger.warn('Connection already exists in DynamoDB, updating timestamp', {
          connectionId,
          userIdKey
        });
        
        // Update the timestamp for existing connection
        await this.client.send(new UpdateCommand({
          TableName: this.tableName,
          Key: {
            userId: userIdKey,
            typeName: typeNameKey
          },
          UpdateExpression: 'SET lastActivity = :lastActivity, expiresAt = :expiresAt',
          ExpressionAttributeValues: {
            ':lastActivity': now,
            ':expiresAt': expiresAt
          }
        }));
        
        return;
      }
      
      logger.info('Adding connection to DynamoDB', {
        connectionId,
        userIdKey,
        userId
      });
      
      const item: Record<string, any> = {
        userId: userIdKey,
        typeName: typeNameKey,
        connectionId,
        createdAt: now,
        lastActivity: now,
        expiresAt,
        type: 'connection'
      };
      
      // Store the actual userId as a separate property if provided
      if (userId) {
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
   * Removes a connection from the repository
   * @param connectionId The WebSocket connection ID to remove
   */
  public async removeConnection(connectionId: string): Promise<void> {
    try {
      // Use consistent SYSTEM-Connections as userId
      const userIdKey = 'SYSTEM-Connections';
      const connectionTypeNameKey = `CONNECTION#${connectionId}`;
      
      // Check if connection exists before trying to delete
      const connection = await this.findConnectionByConnectionId(connectionId);
      
      if (!connection) {
        logger.warn('No connection found to remove', { connectionId });
        return;
      }
      
      // Delete the connection using the consistent key pattern
      await this.client.send(new DeleteCommand({
        TableName: this.tableName,
        Key: {
          userId: userIdKey,
          typeName: connectionTypeNameKey
        }
      }));
      
      // If this connection had a conversation ID, also clean up the conversation mapping
      if (connection.conversationId) {
        const conversationTypeNameKey = `CONVERSATION#${connection.conversationId}#${connectionId}`;
        
        // Delete the conversation mapping entry
        await this.client.send(new DeleteCommand({
          TableName: this.tableName,
          Key: {
            userId: userIdKey,
            typeName: conversationTypeNameKey
          }
        }));
        
        logger.info('Removed conversation mapping from DynamoDB', { 
          connectionId, 
          conversationId: connection.conversationId 
        });
      }
      
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
      // Use consistent SYSTEM-Connections userId pattern
      const userIdKey = 'SYSTEM-Connections';
      
      // Query using the userId key and filter for connections
      // This is more efficient than scanning the entire table
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId AND begins_with(typeName, :typePrefix)',
        ExpressionAttributeValues: {
          ':userId': userIdKey,
          ':typePrefix': 'CONNECTION#'
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
      // Use consistent SYSTEM-Connections as userId
      const userIdKey = 'SYSTEM-Connections';
      const connectionTypeNameKey = `CONNECTION#${connectionId}`;
      const conversationTypeNameKey = `CONVERSATION#${conversationId}#${connectionId}`;
      
      // Check if connection exists
      const connection = await this.findConnectionByConnectionId(connectionId);
      
      if (!connection) {
        logger.warn('No connection found to update conversation mapping', { connectionId });
        return;
      }
      
      const now = Date.now();
      const expiresAt = Math.floor(now / 1000) + this.ttlInSeconds;
      
      // Update the connection record with the conversationId
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          userId: userIdKey,
          typeName: connectionTypeNameKey
        },
        UpdateExpression: 'SET conversationId = :conversationId, lastActivity = :lastActivity, expiresAt = :expiresAt',
        ExpressionAttributeValues: {
          ':conversationId': conversationId,
          ':lastActivity': now,
          ':expiresAt': expiresAt
        }
      }));
      
      // Create a separate record for the conversation mapping
      await this.client.send(new PutCommand({
        TableName: this.tableName,
        Item: {
          userId: userIdKey,
          typeName: conversationTypeNameKey,
          connectionId,
          conversationId,
          createdAt: now,
          lastActivity: now,
          expiresAt,
          type: 'conversation-connection'
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
      const expiresAt = Math.floor(now / 1000) + this.ttlInSeconds;
      
      // Always use consistent SYSTEM-Connections as userId
      const userIdKey = 'SYSTEM-Connections';
      const typeNameKey = `CONNECTION#${connectionId}`;
      
      await this.client.send(new UpdateCommand({
        TableName: this.tableName,
        Key: {
          userId: userIdKey,
          typeName: typeNameKey
        },
        UpdateExpression: 'SET lastActivity = :lastActivity, expiresAt = :expiresAt',
        ExpressionAttributeValues: {
          ':lastActivity': now,
          ':expiresAt': expiresAt
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

  /**
   * Gets all connection IDs associated with a conversation
   * @param conversationId The conversation ID to get connections for
   * @returns Array of connection IDs
   */
  public async getConnectionsByConversation(conversationId: string): Promise<string[]> {
    try {
      // Use consistent SYSTEM-Connections as userId
      const userIdKey = 'SYSTEM-Connections';
      const conversationPrefix = `CONVERSATION#${conversationId}#`;
      
      // Query for all items with the conversation prefix
      const result = await this.client.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId AND begins_with(typeName, :typePrefix)',
        ExpressionAttributeValues: {
          ':userId': userIdKey,
          ':typePrefix': conversationPrefix
        }
      }));
      
      if (!result.Items || result.Items.length === 0) {
        return [];
      }
      
      return result.Items
        .filter(item => item.connectionId)
        .map(item => item.connectionId);
    } catch (error) {
      logger.error('Failed to get connections by conversation from DynamoDB', {
        error: error instanceof Error ? error.message : String(error),
        conversationId
      });
      return [];
    }
  }
} 