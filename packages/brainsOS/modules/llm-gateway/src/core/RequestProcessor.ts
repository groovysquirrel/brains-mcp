import { Logger } from '../../../utils/logging/Logger';
import { GatewayRequest } from '../types/Request';

// Global variables for Lambda reuse
const logger = new Logger('RequestProcessor');

/**
 * Validates required fields in a gateway request
 */
export const validateRequest = (request: GatewayRequest): void => {
  if (!request.modelId) {
    throw new Error('Missing required field: modelId. Please specify which model to use (e.g., "anthropic.claude-3-sonnet-20240229-v1:0" or an alias like "claude-3")');
  }
  
  if (!request.provider) {
    throw new Error('Missing required field: provider. Please specify which provider to use (e.g., "bedrock")');
  }
  
  // Check if either messages or prompt is provided
  if (!request.messages?.length && !request.prompt && !request.conversationId) {
    throw new Error('Missing required field: Either messages, prompt, or conversationId must be provided');
  }
  
  // If conversationId is provided, userId is required
  if (request.conversationId && !request.userId) {
    throw new Error('Missing required field: userId is required when conversationId is provided');
  }
};

/**
 * Normalizes modality in a gateway request
 */
export const normalizeRequest = (request: GatewayRequest): GatewayRequest => {
  const normalizedRequest = { ...request };
  
  // Convert simple "text" modality to "text-to-text"
  if (normalizedRequest.modality === 'text') {
    normalizedRequest.modality = 'text-to-text';
  }
  
  return normalizedRequest;
}; 