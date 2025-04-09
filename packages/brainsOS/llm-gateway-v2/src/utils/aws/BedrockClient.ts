import { BedrockRuntimeClient } from '@aws-sdk/client-bedrock-runtime';
import { Logger } from '../logging/Logger';
import { Resource } from 'sst';

// Global variables for Lambda reuse
let bedrockClientInstance: BedrockRuntimeClient | null = null;
let region: string = 'us-east-1';
const logger = new Logger('BedrockClient');

/**
 * Initialize AWS Bedrock client and resources
 * This should be called at cold start time (outside handlers)
 */
export const initializeBedrockClient = (awsRegion?: string): void => {
  try {
    // Set region from provided value or default
    region = awsRegion || 'us-east-1';
    
    // Reset client to force recreation with new settings
    bedrockClientInstance = null;
    
    logger.info('Bedrock client initialized', {
      region
    });
  } catch (error) {
    logger.error('Failed to initialize Bedrock client', { error });
  }
};

/**
 * Get Bedrock client instance (creates if not exists)
 * Uses module-level variables for Lambda reuse
 */
export const getBedrockClient = (): BedrockRuntimeClient => {
  if (!bedrockClientInstance) {
    logger.info('Creating new Bedrock client', { region });
    bedrockClientInstance = new BedrockRuntimeClient({ region });
  }
  return bedrockClientInstance;
}; 