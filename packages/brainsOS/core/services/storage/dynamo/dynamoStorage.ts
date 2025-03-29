import { 
  DynamoDBDocumentClient, 
  GetCommand, 
  PutCommand, 
  QueryCommand, 
  DeleteCommand,
  UpdateCommand
} from "@aws-sdk/lib-dynamodb";
import { StorageService, StorageKey, QueryOptions } from '../storageTypes';
import { dynamoDb } from './dynamoOperations';

export class DynamoStorageService implements StorageService {
  constructor(
    private tableName: string,
    private client: DynamoDBDocumentClient = dynamoDb
  ) {}

  async getItem<T>(key: StorageKey): Promise<T | null> {
    const command = new GetCommand({
      TableName: this.tableName,
      Key: {
        userId: key.partitionKey,
        typeName: key.sortKey
      },
      ConsistentRead: true
    });

    const response = await this.client.send(command);
    return response.Item as T || null;
  }

  async putItem<T>(key: StorageKey, item: T): Promise<void> {
    const command = new PutCommand({
      TableName: this.tableName,
      Item: {
        userId: key.partitionKey,
        typeName: key.sortKey,
        ...item,
        updatedAt: new Date().toISOString()
      }
    });

    await this.client.send(command);
  }

  async queryItems<T>(partitionKey: string, options: QueryOptions): Promise<T[]> {
    console.log('[DynamoStorage] Querying items:', {
      tableName: this.tableName,
      partitionKey,
      prefix: options.prefix
    });

    try {
      const command = new QueryCommand({
        TableName: this.tableName,
        KeyConditionExpression: 'userId = :userId AND begins_with(typeName, :prefix)',
        ExpressionAttributeValues: {
          ':userId': partitionKey,
          ':prefix': options.prefix || ''
        },
        ...(options.projection && {
          ProjectionExpression: options.projection.join(', ')
        })
      });

      console.log('[DynamoStorage] Executing query command:', {
        KeyConditionExpression: command.input.KeyConditionExpression,
        ExpressionAttributeValues: command.input.ExpressionAttributeValues
      });

      const { Items = [] } = await this.client.send(command);
      
      console.log('[DynamoStorage] Query results:', {
        count: Items.length,
        items: Items.map(item => ({
          userId: item.userId,
          typeName: item.typeName
        }))
      });

      return Items as T[];
    } catch (error) {
      console.error('[DynamoStorage] Error querying items:', {
        error: error instanceof Error ? error.message : error,
        tableName: this.tableName,
        partitionKey,
        prefix: options.prefix
      });
      throw error;
    }
  }

  async deleteItem(key: StorageKey): Promise<void> {
    const command = new DeleteCommand({
      TableName: this.tableName,
      Key: {
        userId: key.partitionKey,
        typeName: key.sortKey
      }
    });

    await this.client.send(command);
  }

  async updateItem<T>(key: StorageKey, updates: Partial<T>): Promise<void> {
    const updateExpressions: string[] = [];
    const expressionAttributeNames: Record<string, string> = {};
    const expressionAttributeValues: Record<string, any> = {};

    Object.entries(updates).forEach(([key, value], index) => {
      const attributeKey = `#attr${index}`;
      const valueKey = `:val${index}`;
      updateExpressions.push(`${attributeKey} = ${valueKey}`);
      expressionAttributeNames[attributeKey] = key;
      expressionAttributeValues[valueKey] = value;
    });

    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        userId: key.partitionKey,
        typeName: key.sortKey
      },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues
    });

    await this.client.send(command);
  }

  async incrementCounter(key: StorageKey, field: string, initialValue: number = 0): Promise<number> {
    const command = new UpdateCommand({
      TableName: this.tableName,
      Key: {
        userId: key.partitionKey,
        typeName: key.sortKey
      },
      UpdateExpression: 'SET #field = if_not_exists(#field, :initial) + :incr',
      ExpressionAttributeNames: {
        '#field': field
      },
      ExpressionAttributeValues: {
        ':initial': initialValue,
        ':incr': 1
      },
      ReturnValues: 'UPDATED_NEW'
    });

    const response = await this.client.send(command);
    return response.Attributes?.[field] || initialValue + 1;
  }
}
