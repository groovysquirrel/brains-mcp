import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { Logger } from '../shared/logging/logger';
import { Resource } from 'sst';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { MoneyManager, UsageMetrics } from '../../modules/money-manager/src/money-manager';

/*

lookup cost information from the gateway? 

*/

// Initialize logger and SQS client
const logger = new Logger('MetricsHandler');
const sqsClient = new SQSClient({});

// Initialize Money Manager
let moneyManager: MoneyManager | null = null;
let moneyManagerInitPromise: Promise<void> | null = null;

/**
 * Ensures the Money Manager is initialized
 * @returns Promise that resolves when Money Manager is ready
 */
async function ensureMoneyManagerInitialized(): Promise<MoneyManager> {
  if (!moneyManager) {
    logger.info('Initializing Money Manager');
    
    moneyManager = new MoneyManager({
      logger,
      dbConfig: {
        user: Resource.brainsOS_RDS_Aurora.username,
        password: Resource.brainsOS_RDS_Aurora.password,
        database: Resource.brainsOS_RDS_Aurora.database,
        host: Resource.brainsOS_RDS_Aurora.host,
        port: Resource.brainsOS_RDS_Aurora.port
      }
    });
    
    moneyManagerInitPromise = moneyManager.initialize();
    await moneyManagerInitPromise;
  } else if (moneyManagerInitPromise) {
    // Wait for existing initialization to complete
    await moneyManagerInitPromise;
  }
  
  return moneyManager;
}

/**
 * Processes metrics messages from SQS queue
 * 
 * @param event - The SQS event containing metrics messages
 * @param context - The Lambda context
 */
export const handler = async (event: SQSEvent, context: Context): Promise<void> => {
  logger.info(`Processing ${event.Records.length} metrics records`);
  
  // Access Aurora database info from SST resources
  const databaseName = Resource.brainsOS_RDS_Aurora?.database;
  
  logger.info('Database info:', {
    databaseName,
    resourceExists: !!Resource.brainsOS_RDS_Aurora,
    host: Resource.brainsOS_RDS_Aurora?.host,
    port: Resource.brainsOS_RDS_Aurora?.port
  });
  
  if (!Resource.brainsOS_RDS_Aurora) {
    logger.error('Aurora database resource not found');
    throw new Error('Aurora database resource not found');
  }
  
  try {
    // Initialize Money Manager
    const moneyManager = await ensureMoneyManagerInitialized();
    
    // Process each record in the batch
    for (const record of event.Records) {
      try {
        await processMetricsRecord(record, moneyManager);
      } catch (error) {
        logger.error('Error processing metrics record', { error, recordId: record.messageId });
        // Continue with other records even if one fails
      }
    }
  } catch (error) {
    logger.error('Error processing metrics batch', { error });
    throw error;
  } finally {
    // Close Money Manager connections
    if (moneyManager) {
      try {
        await moneyManager.close();
        logger.info('Money Manager connections closed');
      } catch (error) {
        logger.error('Error closing Money Manager connections', { error });
      }
    }
  }
};

/**
 * Process a single metrics record from the queue
 * 
 * @param record - The SQS record containing metrics data
 * @param moneyManager - The Money Manager instance
 */
async function processMetricsRecord(record: SQSRecord, moneyManager: MoneyManager): Promise<void> {
  try {
    // Parse the message body
    const body = JSON.parse(record.body);
    
    // Log the metrics data (basic info only)
    logger.info('Processing metrics record', {
      messageId: record.messageId,
      requestId: body.requestId,
      userId: body.userId,
      modelId: body.modelId,
      tokensTotal: (body.tokensIn || 0) + (body.tokensOut || 0)
    });
    
    // Convert metrics data to UsageMetrics format
    const metricsData: UsageMetrics = {
      requestId: body.requestId,
      userId: body.userId,
      conversationId: body.conversationId,
      modelId: body.modelId,
      provider: body.provider,
      tokensIn: body.tokensIn || 0,
      tokensOut: body.tokensOut || 0,
      startTime: body.startTime,
      endTime: body.endTime,
      duration: body.duration,
      source: body.source,
      success: body.success,
      error: body.error,
      metadata: body
    };
    
    // Process the metrics through Money Manager
    const transaction = await moneyManager.processUsageMetrics(metricsData);
    
    logger.info('Metrics processed and transaction recorded', { 
      transactionId: transaction.transactionId,
      amount: transaction.amount,
      currency: transaction.currency
    });
    
    // Acknowledge the message by deleting it from the queue
    if (record.receiptHandle) {
      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: Resource.brainsOS_queue_metrics.url,
        ReceiptHandle: record.receiptHandle
      }));
      
      logger.debug('Deleted message from queue', { messageId: record.messageId });
    }
  } catch (error) {
    logger.error('Failed to process metrics record', { error, record });
    throw error; // Rethrow to be caught by the main handler
  }
}