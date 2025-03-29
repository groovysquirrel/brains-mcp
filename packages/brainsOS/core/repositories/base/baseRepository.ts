import { DynamoDB } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocument } from '@aws-sdk/lib-dynamodb';

const ddbClient = new DynamoDB({});
const ddbDocClient = DynamoDBDocument.from(ddbClient);

export abstract class baseRepository<T> {
    protected abstract typeName: string;
    protected abstract namespace: string;
    protected abstract tableName: string;
    
    protected async getData(userId: string, id: string): Promise<T | null> {
      try {
        const response = await ddbDocClient.get({
          TableName: this.tableName,
          Key: {
            userId,
            typeName: id
          }
        });

        return response.Item?.data as T || null;
      } catch (error) {
        console.error(`Error getting data for ${this.namespace}:`, error);
        throw error;
      }
    }
  
    protected async setData(userId: string, id: string, data: T): Promise<void> {
      try {
        await ddbDocClient.put({
          TableName: this.tableName,
          Item: {
            userId,
            typeName: id,
            data
          }
        });
      } catch (error) {
        console.error(`Error setting data for ${this.namespace}:`, error);
        throw error;
      }
    }
  
    abstract get(userId: string, id: string): Promise<T | null>;
    abstract set(userId: string, id: string, data: T): Promise<void>;
}