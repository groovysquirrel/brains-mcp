import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { Logger } from '../logging/Logger';
import { LLMUsageMetadata } from '../../llm-gateway/src/types/Metrics';
import { Resource } from 'sst';

// Global variables for Lambda reuse
let s3ClientInstance: S3Client | null = null;
let bucketName: string | undefined;
let region: string = 'us-east-1';
const logger = new Logger('MetricsS3Client');

/**
 * Initialize AWS S3 client and resources
 * This should be called at cold start time (outside handlers)
 */
export const initializeS3Client = (awsRegion?: string): void => {
  try {
    // Set region from provided value or default
    region = awsRegion || 'us-east-1';
    
    // Get bucket name from SST resources
    // @ts-ignore
    bucketName = Resource.brainsOS_bucket_logs.name;
    
    // Reset client to force recreation with new settings
    s3ClientInstance = null;
    
    logger.info('S3 client initialized from SST Resource', {
      region,
      bucketName
    });
  } catch (error) {
    logger.error('Failed to initialize S3 client from SST Resource', { error });
    bucketName = undefined;
  }
};

/**
 * Get S3 client instance (creates if not exists)
 * Uses module-level variables for Lambda reuse
 */
export const getS3Client = (): S3Client => {
  if (!s3ClientInstance) {
    logger.info('Creating new S3 client', { region });
    s3ClientInstance = new S3Client({ region });
  }
  return s3ClientInstance;
};

/**
 * Stores LLM usage metadata in S3
 * @param metadata The metrics data to store
 */
export const storeMetricsInS3 = async (metadata: LLMUsageMetadata): Promise<void> => {
  try {
    if (!bucketName) {
      logger.warn('No S3 bucket configured for metrics storage');
      return;
    }
    
    const client = getS3Client();
    
    // Create a unique key for the object
    // Format depends on whether this is a conversation or standalone prompt
    const date = new Date(metadata.startTime);
    const year = date.getUTCFullYear();
    const month = String(date.getUTCMonth() + 1).padStart(2, '0');
    const day = String(date.getUTCDate()).padStart(2, '0');
    
    // Build storage path based on whether it's a conversation or standalone prompt
    let key;
    if (metadata.conversationId) {
      // For conversation-based interactions, include the conversationId
      key = `${year}/${month}/${day}/${metadata.userId}/${metadata.modelId}/${metadata.conversationId}/${metadata.startTime}.json`;
    } else {
      // For standalone prompts, use "prompt-{requestId}" instead
      key = `${year}/${month}/${day}/${metadata.userId}/${metadata.modelId}/prompt-${metadata.requestId}/${metadata.startTime}.json`;
    }
    
    // Create and send the command
    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      Body: JSON.stringify(metadata),
      ContentType: 'application/json',
      Metadata: {
        userId: metadata.userId,
        provider: metadata.provider,
        source: metadata.source,
        modelId: metadata.modelId
      }
    });
    
    await client.send(command);
    
    logger.info('Successfully stored LLM usage metadata in S3', {
      requestId: metadata.requestId,
      bucket: bucketName,
      key: key
    });
  } catch (error) {
    // Log error but don't fail the operation
    logger.error('Failed to store LLM usage metadata in S3', { 
      error,
      bucketName
    });
  }
};