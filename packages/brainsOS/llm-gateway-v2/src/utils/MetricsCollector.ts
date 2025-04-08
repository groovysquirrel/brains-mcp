import { Logger } from './logging/Logger';
import { initializeSQSClient, sendMetricsToSQS } from './aws/SQSClient';
import { initializeS3Client, storeMetricsInS3 } from './aws/S3Client';
import { LLMUsageMetadata, MetricsDestination, MetricsConfig } from '../types/Metrics';

// Logger for metrics tracking
const logger = new Logger('MetricsCollector');

// Store config once for reuse
let metricsConfig: MetricsConfig | null = null;

/**
 * Initialize the metrics collector with a configuration object
 * This is designed to be called during cold-start, outside of request handlers
 * @param config The metrics configuration to use
 */
export const initializeMetricsCollector = (config: MetricsConfig): void => {
  metricsConfig = config;
  
  // Initialize AWS clients with region
  initializeS3Client(config.awsRegion);
  initializeSQSClient(config.awsRegion);
  
  logger.info('Metrics collector initialized', { 
    enabled: config.enabled, 
    destination: config.destination,
    region: config.awsRegion
  });
};

/**
 * Records LLM usage metrics to the configured destination(s)
 * @param metadata The metrics data to record
 */
export const recordLLMMetrics = async (metadata: LLMUsageMetadata): Promise<void> => {
  try {
    // Check if metrics are configured
    if (!metricsConfig) {
      logger.warn('Metrics collector not initialized, metrics will not be recorded');
      return;
    }
    
    // Exit early if disabled
    if (!metricsConfig.enabled || metricsConfig.destination === MetricsDestination.NONE) {
      return;
    }
    
    // Send to SQS if configured
    if ((metricsConfig.destination === MetricsDestination.SQS || 
         metricsConfig.destination === MetricsDestination.BOTH)) {
      await sendMetricsToSQS(metadata);
    }
    
    // Store in S3 if configured
    if ((metricsConfig.destination === MetricsDestination.S3 || 
         metricsConfig.destination === MetricsDestination.BOTH)) {
      await storeMetricsInS3(metadata);
    }
    
    logger.info('LLM metrics recorded successfully', {
      requestId: metadata.requestId,
      destination: metricsConfig.destination
    });
  } catch (error) {
    // Never fail the main operation due to metrics issues
    logger.error('Failed to record LLM metrics', { error, metadata });
  }
}; 