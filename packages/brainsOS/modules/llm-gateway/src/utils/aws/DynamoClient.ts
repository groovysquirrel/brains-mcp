import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient } from '@aws-sdk/lib-dynamodb';
import { Resource } from 'sst';

// Create a single DynamoDB client instance to allow connection reuse
let dynamoClient: DynamoDBClient | null = null;
let docClient: DynamoDBDocumentClient | null = null;

/**
 * Gets or creates a DynamoDB client instance
 * Reuses the same instance across Lambda invocations when possible
 */
export const getDynamoClient = (): DynamoDBClient => {
  if (!dynamoClient) {
    dynamoClient = new DynamoDBClient({});
  }
  return dynamoClient;
};

/**
 * Gets or creates a DynamoDB Document client instance
 * The document client provides a more convenient interface
 */
export const getDocumentClient = (): DynamoDBDocumentClient => {
  if (!docClient) {
    const marshallOptions = {
      // Convert empty strings, blobs, and sets to null
      convertEmptyValues: true,
      // Remove undefined values
      removeUndefinedValues: true,
      // Convert typeof object to map attribute
      convertClassInstanceToMap: true,
    };

    const unmarshallOptions = {
      // Return numbers as numbers, not strings
      wrapNumbers: false,
    };

    docClient = DynamoDBDocumentClient.from(getDynamoClient(), {
      marshallOptions,
      unmarshallOptions,
    });
  }
  return docClient;
};

export const getServerName = (): string => {
  // @ts-ignore - This property is added at runtime by SST; the error can be safely ignored
  return Resource.brainsOS_userData.name;
};
