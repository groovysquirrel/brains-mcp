/**
 * Types for the LLM Gateway metrics system
 */

/**
 * Cost information for an LLM operation
 */
export interface CostInfo {
  cost: number;
  currency: string;
  pricing?: {
    input: number;
    output: number;
  };
}

/**
 * Model connection type
 */
export type ConnectionType = 'ONDEMAND' | 'PROVISIONED';

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
  connectionType?: ConnectionType;  // Type of connection (ONDEMAND or PROVISIONED)
  tokensIn: number; 
  tokensOut: number;
  startTime: string;
  endTime: string;
  duration: number;
  source: 'api' | 'websocket';
  tags?: string[];
  success: boolean;
  error?: string;
  cost?: CostInfo; // Cost information based on token usage
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