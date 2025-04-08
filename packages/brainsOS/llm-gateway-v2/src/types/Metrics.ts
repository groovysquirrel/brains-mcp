/**
 * Types for the LLM Gateway metrics system
 */

/**
 * Metadata for an LLM operation
 * Contains all the information needed for accounting and analysis
 */
export interface LLMUsageMetadata {
  userId: string;
  requestId: string;
  conversationId?: string;
  promptId?: string;
  modelId: string;
  provider: string;
  tokensIn: number; 
  tokensOut: number;
  startTime: string;
  endTime: string;
  duration: number;
  source: 'api' | 'websocket';
  tags?: string[];
  success: boolean;
  error?: string;
}

/**
 * Destination types for metrics data
 */
export enum MetricsDestination {
  SQS = 'sqs',
  S3 = 's3',
  BOTH = 'both',
  NONE = 'none'
}

/**
 * Configuration for LLM metrics
 */
export interface MetricsConfig {
  enabled: boolean;
  destination: MetricsDestination;
  sqsQueueUrl?: string;
  s3BucketName?: string;
  awsRegion?: string; // AWS region for S3 and SQS clients
} 