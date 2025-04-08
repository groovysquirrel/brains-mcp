import {
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  GetItemCommand
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../utils/logging/Logger';
import { ConversationRepository } from './ConversationRepository';
import {
  Conversation,
  CreateConversationOptions,
  AddMessageOptions,
  GetConversationOptions,
  ListConversationsOptions,
  ListConversationsResponse,
  ConversationMessage
} from './ConversationTypes';
import { getDynamoClient} from '../../utils/dynamodb/DynamoClient';
import { Resource } from 'sst';

/**
 * Implementation of ConversationRepository that uses DynamoDB
 * Optimized for serverless environments
 */
export class DynamoConversationRepository implements ConversationRepository {
  private logger: Logger;
  private tableName: string;

  /**
   * Constructor
   * @param tableName - DynamoDB table name (optional, uses SST Resource reference by default)
   */
  constructor() {
    this.logger = new Logger('DynamoConversationRepository');
    this.tableName = Resource.userData.name;
    this.logger.info('Initialized with table', { tableName: this.tableName });
  }

  /**
   * Creates a new conversation
   * @param options - Options for creating the conversation
   * @returns The created conversation
   */
  async createConversation(options: CreateConversationOptions): Promise<Conversation> {
    const { userId, conversationId = uuidv4(), initialMessages = [], metadata = {} } = options;
    const timestamp = Date.now();
    
    const conversation: Conversation = {
      userId,
      conversationId,
      messages: initialMessages,
      metadata,
      created: timestamp,
      updated: timestamp
    };

    try {
      const dynamoClient = getDynamoClient();
      
      // Store the conversation metadata
      await dynamoClient.send(new PutItemCommand({
        TableName: this.tableName,
        Item: {
          typeName: { S: `CONVERSATION#${conversationId}#META` },
          userId: { S: userId },
          conversationId: { S: conversationId },
          created: { N: timestamp.toString() },
          updated: { N: timestamp.toString() },
          metadata: { S: JSON.stringify(metadata) },
          // Add TTL attribute if needed in the future
          // TTL: { N: (Math.floor(Date.now() / 1000) + 2592000).toString() } // 30 day expiration
        }
      }));

      // Store each message if there are any
      if (initialMessages.length > 0) {
        await this.addMessages(userId, conversationId, initialMessages);
      }

      this.logger.info('Created conversation', { userId, conversationId });
      return conversation;
    } catch (error: any) {
      this.logger.error('Failed to create conversation', { error, userId, conversationId });
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  /**
   * Retrieves a conversation by userId and conversationId
   * @param options - Options for retrieving the conversation
   * @returns The conversation, or null if not found
   */
  async getConversation(options: GetConversationOptions): Promise<Conversation | null> {
    const { userId, conversationId, limit } = options;

    try {
      const dynamoClient = getDynamoClient();
      
      // First get metadata
      const metaResult = await dynamoClient.send(new GetItemCommand({
        TableName: this.tableName,
        Key: {
          typeName: { S: `CONVERSATION#${conversationId}#META` },
          userId: { S: userId }
        }
      }));

      if (!metaResult.Item) {
        return null;
      }

      // Get messages
      const messagesResult = await dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':typeName': { S: `CONVERSATION#${conversationId}#MSG#` }
        },
        ScanIndexForward: true, // Sort ascending by sort key
        Limit: limit // Apply limit if provided
      }));

      const metadata = JSON.parse(metaResult.Item.metadata?.S || '{}');
      const created = Number(metaResult.Item.created?.N || '0');
      const updated = Number(metaResult.Item.updated?.N || '0');

      const messages: ConversationMessage[] = messagesResult.Items?.map(item => ({
        role: item.role?.S || '',
        content: item.content?.S || '',
        timestamp: Number(item.timestamp?.N || '0'),
        metadata: JSON.parse(item.metadata?.S || '{}')
      })) || [];

      const conversation: Conversation = {
        userId,
        conversationId,
        messages,
        metadata,
        created,
        updated
      };

      return conversation;
    } catch (error: any) {
      this.logger.error('Failed to retrieve conversation', { error, userId, conversationId });
      throw new Error(`Failed to retrieve conversation: ${error.message}`);
    }
  }

  /**
   * Adds a message to an existing conversation
   * @param options - Options for adding the message
   * @returns The updated conversation
   * @throws Error if the conversation does not exist
   */
  async addMessage(options: AddMessageOptions): Promise<Conversation> {
    const { userId, conversationId, message } = options;
    
    try {
      const dynamoClient = getDynamoClient();
      
      // Check if conversation exists
      const exists = await this.conversationExists(userId, conversationId);
      if (!exists) {
        throw new Error(`Conversation ${conversationId} does not exist for user ${userId}`);
      }

      // Get the current count of messages to determine sequence number
      const countResult = await dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':typeName': { S: `CONVERSATION#${conversationId}#MSG#` }
        },
        Select: 'COUNT'
      }));

      const sequenceNumber = countResult.Count || 0;
      const timestamp = message.timestamp || Date.now();

      // Add the message
      await dynamoClient.send(new PutItemCommand({
        TableName: this.tableName,
        Item: {
          typeName: { S: `CONVERSATION#${conversationId}#MSG#${sequenceNumber.toString().padStart(10, '0')}` },
          userId: { S: userId },
          conversationId: { S: conversationId },
          sequenceNumber: { N: sequenceNumber.toString() },
          role: { S: message.role },
          content: { S: message.content },
          timestamp: { N: timestamp.toString() },
          metadata: { S: JSON.stringify(message.metadata || {}) }
        }
      }));

      // Update the conversation metadata (updated timestamp)
      await dynamoClient.send(new PutItemCommand({
        TableName: this.tableName,
        Item: {
          typeName: { S: `CONVERSATION#${conversationId}#META` },
          userId: { S: userId },
          conversationId: { S: conversationId },
          updated: { N: timestamp.toString() }
        },
        ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
      }));

      // Return the updated conversation
      return this.getConversation({ userId, conversationId }) as Promise<Conversation>;
    } catch (error: any) {
      this.logger.error('Failed to add message', { error, userId, conversationId });
      throw error;
    }
  }

  /**
   * Lists conversations for a user
   * @param options - Options for listing conversations
   * @returns A response containing conversations and optional pagination token
   */
  async listConversations(options: ListConversationsOptions): Promise<ListConversationsResponse> {
    const { userId, limit = 10, nextToken } = options;

    try {
      const dynamoClient = getDynamoClient();
      
      const queryParams: any = {
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':typeName': { S: 'CONVERSATION#' }
        },
        FilterExpression: 'contains(SK, "#META")', // Only return metadata items
        Limit: limit
      };

      // Add pagination token if provided
      if (nextToken) {
        queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
      }

      const result = await dynamoClient.send(new QueryCommand(queryParams));
      
      // Extract conversation IDs from metadata items
      const conversationIds = result.Items?.map(item => {
        const sk = item.SK.S || '';
        // Extract ID from "CONVERSATION#123#META"
        return sk.split('#')[1];
      }) || [];

      // Get full conversations
      const conversations: Conversation[] = [];
      for (const id of conversationIds) {
        const conversation = await this.getConversation({ userId, conversationId: id });
        if (conversation) {
          conversations.push(conversation);
        }
      }

      // Format pagination token
      let responseNextToken: string | undefined;
      if (result.LastEvaluatedKey) {
        responseNextToken = Buffer.from(JSON.stringify(result.LastEvaluatedKey)).toString('base64');
      }

      return {
        conversations,
        nextToken: responseNextToken
      };
    } catch (error: any) {
      this.logger.error('Failed to list conversations', { error, userId });
      throw new Error(`Failed to list conversations: ${error.message}`);
    }
  }

  /**
   * Deletes a conversation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @returns true if the conversation was deleted, false if it wasn't found
   */
  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    try {
      const dynamoClient = getDynamoClient();
      
      // First check if conversation exists
      const exists = await this.conversationExists(userId, conversationId);
      if (!exists) {
        return false;
      }

      // Get all items related to this conversation
      const items = await dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':typeName': { S: `CONVERSATION#${conversationId}#` }
        }
      }));

      if (!items.Items || items.Items.length === 0) {
        return false;
      }

      // Delete all items in batches (25 is DynamoDB batch limit)
      const batchSize = 25;
      for (let i = 0; i < items.Items.length; i += batchSize) {
        const batch = items.Items.slice(i, i + batchSize);
        
        await dynamoClient.send(new BatchWriteItemCommand({
          RequestItems: {
            [this.tableName]: batch.map(item => ({
              DeleteRequest: {
                Key: {
                  userId: item.userId,
                  typeName: item.typeName
                }
              }
            }))
          }
        }));
      }

      this.logger.info('Deleted conversation', { userId, conversationId });
      return true;
    } catch (error: any) {
      this.logger.error('Failed to delete conversation', { error, userId, conversationId });
      throw new Error(`Failed to delete conversation: ${error.message}`);
    }
  }

  /**
   * Adds multiple messages to a conversation in a batch operation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @param messages - The messages to add
   * @returns The updated conversation
   * @throws Error if the conversation does not exist
   */
  async addMessages(userId: string, conversationId: string, messages: ConversationMessage[]): Promise<Conversation> {
    if (messages.length === 0) {
      return this.getConversation({ userId, conversationId }) as Promise<Conversation>;
    }

    try {
      const dynamoClient = getDynamoClient();
      
      // Check if conversation exists
      const exists = await this.conversationExists(userId, conversationId);
      if (!exists) {
        throw new Error(`Conversation ${conversationId} does not exist for user ${userId}`);
      }

      // Get current count
      const countResult = await dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'PK = :pk and begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':typeName': { S: `CONVERSATION#${conversationId}#MSG#` }
        },
        Select: 'COUNT'
      }));

      let sequenceNumber = countResult.Count || 0;
      const latestTimestamp = Math.max(...messages.map(m => m.timestamp || Date.now()));

      // Add messages in batches (25 is DynamoDB batch limit)
      const batchSize = 25;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        
        await dynamoClient.send(new BatchWriteItemCommand({
          RequestItems: {
            [this.tableName]: batch.map(message => {
              const timestamp = message.timestamp || Date.now();
              const seqNum = sequenceNumber++;
              
              return {
                PutRequest: {
                  Item: {
                    typeName: { S: `CONVERSATION#${conversationId}#MSG#${seqNum.toString().padStart(10, '0')}` },
                    userId: { S: userId },
                    conversationId: { S: conversationId },
                    sequenceNumber: { N: seqNum.toString() },
                    role: { S: message.role },
                    content: { S: message.content },
                    timestamp: { N: timestamp.toString() },
                    metadata: { S: JSON.stringify(message.metadata || {}) }
                  }
                }
              };
            })
          }
        }));
      }

      // Update conversation metadata (updated timestamp)
      await dynamoClient.send(new PutItemCommand({
        TableName: this.tableName,
        Item: {
          typeName: { S: `CONVERSATION#${conversationId}#META` },
          userId: { S: userId },
          conversationId: { S: conversationId },
          updated: { N: latestTimestamp.toString() }
        },
        ConditionExpression: 'attribute_exists(PK) AND attribute_exists(SK)'
      }));

      // Return the updated conversation
      return this.getConversation({ userId, conversationId }) as Promise<Conversation>;
    } catch (error: any) {
      this.logger.error('Failed to add messages batch', { error, userId, conversationId });
      throw error;
    }
  }

  /**
   * Checks if a conversation exists
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @returns true if the conversation exists, false otherwise
   */
  async conversationExists(userId: string, conversationId: string): Promise<boolean> {
    try {
      const dynamoClient = getDynamoClient();
      
      const result = await dynamoClient.send(new GetItemCommand({
        TableName: this.tableName,
        Key: {
          typeName: { S: `CONVERSATION#${conversationId}#META` },
          userId: { S: userId }
        },
        ProjectionExpression: 'PK, SK' // Only retrieve keys to minimize data transfer
      }));

      return !!result.Item;
    } catch (error: any) {
      this.logger.error('Failed to check if conversation exists', { error, userId, conversationId });
      throw new Error(`Failed to check if conversation exists: ${error.message}`);
    }
  }
}
