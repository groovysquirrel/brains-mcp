import { Logger, LogLevel } from '../utils/logging/Logger';
import { GatewayRequest } from '../types/Request';
import { GatewayResponse } from '../types/Response';
import { LLMUsageMetadata, ConnectionType } from '../types/Metrics';
import { recordLLMMetrics } from '../utils/logging/MetricsCollector';
import { v4 as uuidv4 } from 'uuid';
import { ModelConfig, CostPerToken } from '../types/Model';

// Global variables for Lambda reuse
const logger = new Logger('MetricsManager');

/**
 * Set the logging level for metrics and other components
 * @param level The log level to set ('debug', 'info', 'warn', 'error', 'none')
 */
export const setLoggingLevel = (level: LogLevel): void => {
  Logger.setLogLevel(level);
  logger.info(`MetricsManager logging level set to: ${level}`);
};


/**
 * Determines the connection type used for a model request
 * @param model The model configuration
 * @param request The gateway request
 * @returns The connection type ('ONDEMAND' or 'PROVISIONED')
 */
export const determineConnectionType = (
  model?: ModelConfig,
  request?: GatewayRequest
): ConnectionType => {
  // Check if request explicitly specifies connection type
  if (request?.metadata?.connectionType) {
    const requestedType = String(request.metadata.connectionType).toUpperCase();
    if (requestedType === 'PROVISIONED') {
      // Verify the model supports provisioned access
      if (model?.access?.provisionable) {
        return 'PROVISIONED';
      } else {
        logger.warn(`Request specified PROVISIONED but model doesn't support it`, {
          modelId: model?.modelId || request?.modelId
        });
      }
    }
  }
  
  // Default to ONDEMAND
  return 'ONDEMAND';
};

/**
 * Tracks usage metrics for a chat operation
 * This function is designed to be non-blocking for the main service path
 */
export const trackUsageMetrics = async (
  request: GatewayRequest, 
  response: GatewayResponse, 
  source: 'api' | 'websocket',
  requestStartTime: number,
  model?: ModelConfig
): Promise<void> => {
  try {
    // Generate a unique request ID
    const requestId = uuidv4();
    
    // Calculate timing information
    const endTime = Date.now();
    const startTime = requestStartTime;
    const duration = endTime - startTime;
    
    // Extract token counts from response metadata
    // First check for usage object which is the standard format
    const responseUsage = response.metadata?.usage as Record<string, number> | undefined;
    
    // If usage object exists, extract token counts from it
    let inputTokensFromMetadata: number | undefined;
    let outputTokensFromMetadata: number | undefined;
    
    if (responseUsage) {
      // Try both formats - nested usage object or direct fields
      inputTokensFromMetadata = responseUsage.promptTokens || 
                               responseUsage.input_tokens || 
                               responseUsage.inputTokens || 
                               undefined;
      
      outputTokensFromMetadata = responseUsage.completionTokens || 
                                responseUsage.output_tokens || 
                                responseUsage.outputTokens || 
                                undefined;
    } else {
      // Try direct fields on metadata
      inputTokensFromMetadata = typeof response.metadata?.input_tokens === 'number' 
        ? response.metadata.input_tokens 
        : undefined;
      
      outputTokensFromMetadata = typeof response.metadata?.output_tokens === 'number'
        ? response.metadata.output_tokens
        : undefined;
    }
    
    // Use API-provided token counts or log a warning if missing
    const tokensIn = inputTokensFromMetadata || 0;
    const tokensOut = outputTokensFromMetadata || 0;
    
    // Log warning if token counts are missing
    if (inputTokensFromMetadata === undefined) {
      logger.warn('Input token count missing from API response', { 
        model: request.modelId, 
        provider: request.provider,
        metadata: response.metadata
      });
    }
    
    if (outputTokensFromMetadata === undefined) {
      logger.warn('Output token count missing from API response', { 
        model: request.modelId, 
        provider: request.provider,
        metadata: response.metadata
      });
    }
    
    // Determine connection type
    const connectionType = determineConnectionType(model, request);
    
    // Extract tags from request if available
    const tagsFromMetadata = request.metadata?.tags;
    const tags = Array.isArray(tagsFromMetadata) ? tagsFromMetadata : [];
    
    // Get userId from request, response metadata, or default to 'anonymous'
    // Check both the direct request userId and metadata userId
    const userId = request.userId || 
                  (response.metadata?.userId as string) || 
                  (request.metadata?.userId as string);
    
    // Create the metrics payload
    const metadata: LLMUsageMetadata = {
      userId,
      requestId,
      conversationId: request.conversationId,
      modelId: request.modelId || (response.metadata?.model as string) || 'unknown',
      provider: request.provider || 'unknown',
      connectionType,  // Add connection type information
      tokensIn,
      tokensOut,
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      source,
      tags,
      success: true,

    };
    
    // Log debugging info
    logger.debug('Preparing metrics payload', {
      userId,
      tokensIn,
      tokensOut,
      requestMetadata: request.metadata,
      responseMetadata: response.metadata
    });
    
    // Send metrics asynchronously
    // We use void to not await this operation to ensure it doesn't block
    recordLLMMetrics(metadata)
      .catch(error => {
        logger.error('Metrics recording failed (async)', { error });
      });
    
    logger.debug('Metrics tracking initiated', { 
      requestId,
      userId,
      tokensIn,
      tokensOut,
      connectionType,
    });
  } catch (error) {
    // Never let metrics tracking interfere with the main flow
    logger.error('Failed to track usage metrics', { error });
  }
};

/**
 * Records metrics for a failed operation
 */
export const trackErrorMetrics = async (
  request: GatewayRequest,
  error: any,
  source: 'api' | 'websocket',
  requestStartTime: number,
  model?: ModelConfig
): Promise<void> => {
  try {
    // Generate a unique request ID
    const requestId = uuidv4();
    
    // Calculate timing information
    const endTime = Date.now();
    const startTime = requestStartTime;
    const duration = endTime - startTime;
    
    // Determine connection type
    const connectionType = determineConnectionType(model, request);
    
    // Extract tags from request if available
    const tagsFromMetadata = request.metadata?.tags;
    const tags = Array.isArray(tagsFromMetadata) ? tagsFromMetadata : [];
    
    // Create the metrics payload for the error
    const metadata: LLMUsageMetadata = {
      userId: request.userId || 'anonymous',
      requestId,
      conversationId: request.conversationId,
      modelId: request.modelId || 'unknown',
      provider: request.provider || 'unknown',
      connectionType,  // Add connection type information
      tokensIn: 0,  // No tokens consumed for input on error
      tokensOut: 0, // No tokens generated for output on error
      startTime: new Date(startTime).toISOString(),
      endTime: new Date(endTime).toISOString(),
      duration,
      source,
      tags,
      success: false,
      error: error.message || 'Unknown error'
    };
    
    // Send metrics asynchronously
    recordLLMMetrics(metadata)
      .catch(metricError => {
        logger.error('Error metrics recording failed (async)', { metricError });
      });
    
    logger.debug('Error metrics tracking initiated', { 
      requestId,
      connectionType
    });
  } catch (metricError) {
    logger.error('Failed to track error metrics', { metricError });
  }
}; 