import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Logger } from '../logging/Logger';
import { LLMUsageMetadata } from '../types/Metrics';
import { Resource } from 'sst';

// Global variables for Lambda reuse
let sqsClientInstance: SQSClient | null = null;
let queueUrl: string | undefined;
let region: string = 'us-east-1';
const logger = new Logger('MetricsSQSClient');

/**
 * Initialize AWS SQS client and resources
 * This should be called at cold start time (outside handlers)
 */
export const initializeSQSClient = (awsRegion?: string): void => {
  try {
    // Set region from provided value or default
    region = awsRegion || 'us-east-1';
    
    // Get queue URL from SST resources
    // @ts-ignore
    queueUrl = Resource.brainsOS_queue_metrics.url;
    
    // Reset client to force recreation with new settings
    sqsClientInstance = null;
    
    logger.info('SQS client initialized from SST Resource', {
      region,
      queueUrl
    });
  } catch (error) {
    logger.error('Failed to initialize SQS client from SST Resource', { error });
    queueUrl = undefined;
  }
};

/**
 * Get SQS client instance (creates if not exists)
 * Uses module-level variables for Lambda reuse
 */
export const getSQSClient = (): SQSClient => {
  if (!sqsClientInstance) {
    logger.info('Creating new SQS client', { region });
    sqsClientInstance = new SQSClient({ region });
  }
  return sqsClientInstance;
};

/**
 * Sends LLM usage metadata to SQS
 * @param metadata The metrics data to send
 */
export const sendMetricsToSQS = async (metadata: LLMUsageMetadata): Promise<void> => {
  try {
    if (!queueUrl) {
      logger.warn('No SQS queue configured for metrics');
      return;
    }
    
    const client = getSQSClient();
    
    // Create and send the message
    const command = new SendMessageCommand({
      QueueUrl: queueUrl,
      MessageBody: JSON.stringify(metadata),
      MessageAttributes: {
        // Add attributes for potential filtering
        UserId: {
          DataType: 'String',
          StringValue: metadata.userId
        },
        Provider: {
          DataType: 'String',
          StringValue: metadata.provider
        },
        Source: {
          DataType: 'String', 
          StringValue: metadata.source
        },
        ModelId: {
          DataType: 'String',
          StringValue: metadata.modelId
        }
      }
    });
    
    await client.send(command);
    
    logger.info('Successfully sent LLM usage metadata to SQS', {
      requestId: metadata.requestId,
      queueUrl
    });
  } catch (error) {
    // Log error but don't fail the operation
    logger.error('Failed to send LLM usage metadata to SQS', { 
      error,
      queueUrl
    });
  }
};