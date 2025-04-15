import {
  PutItemCommand,
  QueryCommand,
  DeleteItemCommand,
  BatchWriteItemCommand,
  GetItemCommand
} from '@aws-sdk/client-dynamodb';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from '../../../../utils/logging/Logger';
import { ConversationRepository } from './ConversationRepository';
import {
  Conversation,
  CreateConversationOptions,
  AddMessageOptions,
  GetConversationOptions,
  ListConversationsOptions,
  ListConversationsResponse,
  ConversationMessage
} from '../../types/Conversation';
import { getDynamoClient, getServerName } from '../../../../utils/aws/DynamoClient';
import { Resource } from 'sst';

/**
 * DynamoDB Implementation of the Conversation Repository
 * 
 * This class handles storing and retrieving conversations from DynamoDB.
 * 
 * DATA MODEL:
 * -----------
 * Conversations are stored with two main item types:
 * 
 * 1. METADATA ITEM:
 *    - Key: { userId, typeName: "CONVERSATION#{id}#META" }
 *    - Attributes:
 *      - conversationId: The unique ID of the conversation
 *      - created: Timestamp when the conversation was created
 *      - updated: Timestamp when the conversation was last updated
 *      - metadata: JSON string containing conversation metadata
 *      - title: Conversation title (extracted from metadata for easy querying)
 *      - tags: String set of tags (if provided)
 * 
 * 2. MESSAGE ITEMS:
 *    - Key: { userId, typeName: "CONVERSATION#{id}#MSG#{sequence}" }
 *    - Attributes:
 *      - conversationId: The conversation the message belongs to
 *      - sequenceNumber: Order of message in conversation
 *      - role: Who sent the message ("user", "assistant", "system")
 *      - content: The actual message text
 *      - timestamp: When the message was sent/created
 *      - metadata: JSON string with message-specific metadata
 */
export class DynamoConversationRepository implements ConversationRepository {
  private logger: Logger;
  private tableName: string;

  /**
   * Constructor initializes the repository with the DynamoDB table name
   */
  constructor() {
    this.logger = new Logger('DynamoConversationRepository');
    
    this.tableName = getServerName(); 
    
    // Fallback if the Resource isn't available
    if (!this.tableName) {
      throw new Error('userData table not found.');
    }
    
    this.logger.info('Initialized with table', { tableName: this.tableName });
  }

  /**
   * Creates a new conversation
   * @param options - Options containing userId, conversationId, and metadata
   * @returns The created conversation
   */
  async createConversation(options: CreateConversationOptions): Promise<Conversation> {
    const { userId, conversationId = uuidv4(), initialMessages = [], metadata = {} } = options;
    const timestamp = Date.now();
    
    // Extract title and tags from metadata if present
    const title = metadata.title || 'New Conversation';
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
    
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
        Item: this.formatConversationMetaItem(userId, conversationId, timestamp, metadata)
      }));

      // Store each message if there are any
      if (initialMessages.length > 0) {
        await this.addMessages(userId, conversationId, initialMessages);
      }

      this.logger.info('Created conversation', { userId, conversationId, title, tagsCount: tags.length });
      return conversation;
    } catch (error: any) {
      this.logger.error('Failed to create conversation', { error, userId, conversationId });
      throw new Error(`Failed to create conversation: ${error.message}`);
    }
  }

  /**
   * Retrieves a conversation by userId and conversationId
   * @param options - Options containing userId, conversationId, and optional limit
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
        KeyConditionExpression: 'userId = :userId and begins_with(typeName, :typeName)',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':typeName': { S: `CONVERSATION#${conversationId}#MSG#` }
        },
        ScanIndexForward: true, // Sort ascending by sort key
        Limit: limit // Apply limit if provided
      }));

      // Parse the metadata and created/updated timestamps
      const metadata = JSON.parse(metaResult.Item.metadata?.S || '{}');
      const created = Number(metaResult.Item.created?.N || '0');
      const updated = Number(metaResult.Item.updated?.N || '0');

      // Parse the messages from DynamoDB format to ConversationMessage format
      const messages: ConversationMessage[] = messagesResult.Items?.map(item => ({
        role: item.role?.S || '',
        content: item.content?.S || '',
        timestamp: Number(item.timestamp?.N || '0'),
        metadata: JSON.parse(item.metadata?.S || '{}')
      })) || [];

      // Build the complete conversation object
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
   * Adds a single message to an existing conversation
   * @param options - Options containing userId, conversationId, and the message to add
   * @returns The updated conversation
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
        KeyConditionExpression: 'userId = :userId and begins_with(typeName, :typeName)',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':typeName': { S: `CONVERSATION#${conversationId}#MSG#` }
        },
        Select: 'COUNT'
      }));

      // Get existing conversation metadata to preserve it
      const existingMeta = await dynamoClient.send(new GetItemCommand({
        TableName: this.tableName,
        Key: {
          typeName: { S: `CONVERSATION#${conversationId}#META` },
          userId: { S: userId }
        }
      }));

      const sequenceNumber = countResult.Count || 0;
      const timestamp = message.timestamp || Date.now();

      // Add the message to DynamoDB
      await dynamoClient.send(new PutItemCommand({
        TableName: this.tableName,
        Item: this.formatMessageItem(userId, conversationId, sequenceNumber, message)
      }));

      // Update the conversation metadata preserving existing attributes
      await dynamoClient.send(new PutItemCommand({
        TableName: this.tableName,
        Item: this.buildMetaUpdateItem(existingMeta.Item, userId, conversationId, timestamp),
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(typeName)'
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
   * @param options - Options containing userId, optional limit and pagination token
   * @returns A response with conversations and optional pagination token
   */
  async listConversations(options: ListConversationsOptions): Promise<ListConversationsResponse> {
    const { userId, limit = 10, nextToken } = options;

    try {
      const dynamoClient = getDynamoClient();
      
      // Build query parameters to find metadata items (filter by itemType)
      const queryParams: any = {
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId and begins_with(typeName, :prefix)',
        FilterExpression: 'itemType = :metaType',
        ExpressionAttributeValues: {
          ':userId': { S: userId },
          ':prefix': { S: 'CONVERSATION#' },
          ':metaType': { S: 'META' }
        },
        Limit: limit
      };

      // Add pagination token if provided
      if (nextToken) {
        queryParams.ExclusiveStartKey = JSON.parse(Buffer.from(nextToken, 'base64').toString());
      }

      const result = await dynamoClient.send(new QueryCommand(queryParams));
      
      // Extract conversation IDs from metadata items
      const conversationIds = result.Items?.map(item => {
        const typeName = item.typeName.S || '';
        const parts = typeName.split('#');
        return parts.length >= 2 ? parts[1] : '';
      }).filter(id => id) || [];

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
   * Deletes a conversation and all its messages
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
        KeyConditionExpression: 'userId = :userId and begins_with(typeName, :typeName)',
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

      // Get existing conversation metadata to preserve it
      const existingMeta = await dynamoClient.send(new GetItemCommand({
        TableName: this.tableName,
        Key: {
          typeName: { S: `CONVERSATION#${conversationId}#META` },
          userId: { S: userId }
        }
      }));

      // Get current count
      const countResult = await dynamoClient.send(new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId and begins_with(typeName, :typeName)',
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
                  Item: this.formatMessageItem(userId, conversationId, seqNum, message)
                }
              };
            })
          }
        }));
      }

      // Update the conversation metadata preserving existing attributes
      await dynamoClient.send(new PutItemCommand({
        TableName: this.tableName,
        Item: this.buildMetaUpdateItem(existingMeta.Item, userId, conversationId, latestTimestamp),
        ConditionExpression: 'attribute_exists(userId) AND attribute_exists(typeName)'
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
        ProjectionExpression: 'userId, typeName' // Only retrieve keys to minimize data transfer
      }));

      return !!result.Item;
    } catch (error: any) {
      this.logger.error('Failed to check if conversation exists', { error, userId, conversationId });
      throw new Error(`Failed to check if conversation exists: ${error.message}`);
    }
  }

  /**
   * FORMAT HELPERS
   * These methods help format data for DynamoDB storage
   */

  /**
   * Creates a formatted DynamoDB item for conversation metadata
   * 
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @param timestamp - The timestamp for created/updated
   * @param metadata - The conversation metadata
   * @returns A formatted DynamoDB item
   */
  private formatConversationMetaItem(
    userId: string,
    conversationId: string,
    timestamp: number,
    metadata: Record<string, any>
  ): Record<string, any> {
    // Extract title and tags if present
    const title = metadata.title || 'New Conversation';
    const tags = Array.isArray(metadata.tags) ? metadata.tags : [];
    
    // Format the item for DynamoDB
    const item: Record<string, any> = {
      typeName: { S: `CONVERSATION#${conversationId}#META` },
      userId: { S: userId },
      conversationId: { S: conversationId },
      itemType: { S: 'META' }, // Add explicit itemType
      created: { N: timestamp.toString() },
      updated: { N: timestamp.toString() },
      metadata: { S: JSON.stringify(metadata) },
      title: { S: title.toString() }
    };
    
    // Add tags if there are any
    if (tags.length > 0) {
      item.tags = { SS: tags.map((tag: string) => tag.toString()) };
    }
    
    return item;
  }

  /**
   * Creates a formatted DynamoDB item for a message
   * 
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @param sequenceNumber - The message sequence number
   * @param message - The message object
   * @returns A formatted DynamoDB item
   */
  private formatMessageItem(
    userId: string,
    conversationId: string,
    sequenceNumber: number,
    message: ConversationMessage
  ): Record<string, any> {
    const timestamp = message.timestamp || Date.now();
    
    return {
      typeName: { S: `CONVERSATION#${conversationId}#MSG#${sequenceNumber.toString().padStart(10, '0')}` },
      userId: { S: userId },
      conversationId: { S: conversationId },
      itemType: { S: 'MSG' }, // Add explicit itemType
      sequenceNumber: { N: sequenceNumber.toString() },
      role: { S: message.role },
      content: { S: message.content },
      timestamp: { N: timestamp.toString() },
      metadata: { S: JSON.stringify(message.metadata || {}) }
    };
  }

  /**
   * Builds an item for updating conversation metadata
   * This preserves existing attributes while updating the timestamp
   * 
   * @param existingItem - The existing item from DynamoDB
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @param timestamp - The new updated timestamp
   * @returns A DynamoDB item with preserved attributes
   */
  private buildMetaUpdateItem(
    existingItem: Record<string, any> | undefined,
    userId: string,
    conversationId: string,
    timestamp: number
  ): Record<string, any> {
    // Base item with required fields
    const metaItem: Record<string, any> = {
      typeName: { S: `CONVERSATION#${conversationId}#META` },
      userId: { S: userId },
      conversationId: { S: conversationId },
      itemType: { S: 'META' }, // Add explicit itemType
      updated: { N: timestamp.toString() }
    };
    
    // If we have an existing item, preserve its attributes
    if (existingItem) {
      // Copy created time if it exists
      if (existingItem.created && existingItem.created.N) {
        metaItem.created = { N: existingItem.created.N };
      }
      
      // Copy metadata JSON if it exists
      if (existingItem.metadata && existingItem.metadata.S) {
        metaItem.metadata = { S: existingItem.metadata.S };
      }
      
      // Copy title if it exists
      if (existingItem.title && existingItem.title.S) {
        metaItem.title = { S: existingItem.title.S };
      }
      
      // Copy tags if they exist
      if (existingItem.tags && existingItem.tags.SS) {
        metaItem.tags = { SS: existingItem.tags.SS };
      }
    }
    
    return metaItem;
  }
}
