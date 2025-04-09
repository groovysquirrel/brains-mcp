import { SQSEvent, SQSRecord, Context } from 'aws-lambda';
import { Logger } from '../../shared/logging/logger';
import { Resource } from 'sst';
import { SQSClient, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import { Client } from 'pg';

// Initialize logger and SQS client
const logger = new Logger('MetricsHandler');
const sqsClient = new SQSClient({});

// Table name for metrics
const METRICS_TABLE = 'llm_usage_metrics';

/**
 * Get a database client connected to Aurora
 */
async function getDbClient(): Promise<Client> {
  try {
    const client = new Client({
      user: Resource.BrainsOSAuroraRDS.username,
      password: Resource.BrainsOSAuroraRDS.password,
      database: Resource.BrainsOSAuroraRDS.database,
      host: Resource.BrainsOSAuroraRDS.host,
      port: Resource.BrainsOSAuroraRDS.port,
      ssl: { rejectUnauthorized: false } // May need to adjust based on your Aurora config
    });

    await client.connect();
    logger.info('Connected to Aurora database');
    return client;
  } catch (error) {
    logger.error('Failed to connect to Aurora database', { error });
    throw error;
  }
}

/**
 * Ensures the metrics table exists in the database
 * 
 * @param client - The PostgreSQL client
 */
async function ensureMetricsTableExists(client: Client): Promise<void> {
  try {
    // Check if the table exists
    const checkTableQuery = `
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = $1
      );
    `;
    
    const result = await client.query(checkTableQuery, [METRICS_TABLE]);
    const tableExists = result.rows[0].exists;
    
    if (!tableExists) {
      logger.info(`Creating metrics table: ${METRICS_TABLE}`);
      
      // Create the metrics table
      const createTableQuery = `
        CREATE TABLE ${METRICS_TABLE} (
          id SERIAL PRIMARY KEY,
          request_id VARCHAR(255) NOT NULL,
          user_id VARCHAR(255) NOT NULL,
          conversation_id VARCHAR(255),
          model_id VARCHAR(255) NOT NULL,
          provider VARCHAR(255) NOT NULL,
          connection_type VARCHAR(50),
          tokens_in INTEGER DEFAULT 0,
          tokens_out INTEGER DEFAULT 0,
          start_time TIMESTAMP NOT NULL,
          end_time TIMESTAMP NOT NULL,
          duration INTEGER NOT NULL,
          source VARCHAR(50) NOT NULL,
          tags JSONB,
          success BOOLEAN NOT NULL,
          error_message TEXT,
          cost NUMERIC(10, 6),
          currency VARCHAR(10),
          pricing JSONB,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        
        CREATE INDEX idx_metrics_user_id ON ${METRICS_TABLE}(user_id);
        CREATE INDEX idx_metrics_request_id ON ${METRICS_TABLE}(request_id);
        CREATE INDEX idx_metrics_model_id ON ${METRICS_TABLE}(model_id);
        CREATE INDEX idx_metrics_start_time ON ${METRICS_TABLE}(start_time);
        CREATE INDEX idx_metrics_success ON ${METRICS_TABLE}(success);
      `;
      
      await client.query(createTableQuery);
      logger.info('Metrics table created successfully');
    } else {
      logger.info('Metrics table already exists');
    }
  } catch (error) {
    logger.error('Failed to ensure metrics table exists', { error });
    throw error;
  }
}

/**
 * Insert a metrics record into the database
 * 
 * @param client - The PostgreSQL client
 * @param metricsData - The metrics data to insert
 */
async function insertMetricsRecord(client: Client, metricsData: any): Promise<void> {
  try {
    const {
      userId,
      requestId,
      conversationId,
      modelId,
      provider,
      connectionType = 'ONDEMAND',
      tokensIn = 0,
      tokensOut = 0,
      startTime,
      endTime,
      duration,
      source,
      tags = [],
      success,
      error: errorMessage,
      cost
    } = metricsData;
    
    const insertQuery = `
      INSERT INTO ${METRICS_TABLE} (
        request_id, user_id, conversation_id, model_id, provider, 
        connection_type, tokens_in, tokens_out, start_time, end_time, 
        duration, source, tags, success, error_message, 
        cost, currency, pricing, metadata
      ) VALUES (
        $1, $2, $3, $4, $5, 
        $6, $7, $8, $9, $10, 
        $11, $12, $13, $14, $15, 
        $16, $17, $18, $19
      )
    `;
    
    await client.query(insertQuery, [
      requestId,
      userId,
      conversationId || null,
      modelId,
      provider,
      connectionType,
      tokensIn,
      tokensOut,
      new Date(startTime),
      new Date(endTime),
      duration,
      source,
      JSON.stringify(tags),
      success,
      errorMessage || null,
      cost?.cost || null,
      cost?.currency || 'USD',
      cost?.pricing ? JSON.stringify(cost.pricing) : null,
      JSON.stringify(metricsData) // Store the full metrics data as JSON
    ]);
    
    logger.info('Metrics record inserted successfully', { requestId });
  } catch (error) {
    logger.error('Failed to insert metrics record', { error });
    throw error;
  }
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
  const databaseName = Resource.BrainsOSAuroraRDS?.database;
  
  logger.info('Database info:', {
    databaseName,
    resourceExists: !!Resource.BrainsOSAuroraRDS,
    host: Resource.BrainsOSAuroraRDS?.host,
    port: Resource.BrainsOSAuroraRDS?.port
  });
  
  if (!Resource.BrainsOSAuroraRDS) {
    logger.error('Aurora database resource not found');
    throw new Error('Aurora database resource not found');
  }
  
  let dbClient: Client | null = null;
  
  try {
    // Connect to the database
    dbClient = await getDbClient();
    
    // Ensure metrics table exists
    await ensureMetricsTableExists(dbClient);
    
    // Process each record in the batch
    for (const record of event.Records) {
      try {
        await processMetricsRecord(record, dbClient);
      } catch (error) {
        logger.error('Error processing metrics record', { error, recordId: record.messageId });
        // Continue with other records even if one fails
      }
    }
  } catch (error) {
    logger.error('Error processing metrics batch', { error });
    throw error;
  } finally {
    // Close the database connection
    if (dbClient) {
      try {
        await dbClient.end();
        logger.info('Database connection closed');
      } catch (error) {
        logger.error('Error closing database connection', { error });
      }
    }
  }
};

/**
 * Process a single metrics record from the queue
 * 
 * @param record - The SQS record containing metrics data
 * @param dbClient - The PostgreSQL client
 */
async function processMetricsRecord(record: SQSRecord, dbClient: Client): Promise<void> {
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
    
    // Store metrics in the database
    await insertMetricsRecord(dbClient, body);
    
    // Acknowledge the message by deleting it from the queue
    if (record.receiptHandle) {
      await sqsClient.send(new DeleteMessageCommand({
        QueueUrl: Resource.BrainsOSMetricsQueue.url,
        ReceiptHandle: record.receiptHandle
      }));
      
      logger.debug('Deleted message from queue', { messageId: record.messageId });
    }
  } catch (error) {
    logger.error('Failed to process metrics record', { error, record });
    throw error; // Rethrow to be caught by the main handler
  }
}