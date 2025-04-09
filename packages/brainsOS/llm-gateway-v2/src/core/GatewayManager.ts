import { Gateway } from '../Gateway';
import { Logger } from '../utils/logging/Logger';
import { ConversationRepository } from '../repositories/conversation/ConversationRepository';
import { DynamoConversationRepository } from '../repositories/conversation/DynamoConversationRepository';
import { ConfigRepository } from '../repositories/config/ConfigRepository';
import { LocalConfigLoader } from '../repositories/config/LocalLoader';
import { Resource } from 'sst';

// Global variables for Lambda reuse
let gatewayInstance: Gateway | null = null;
let configSource: string = 'local';
let configPath: string | undefined;
let configRepository: ConfigRepository | undefined = undefined;
let conversationRepository: ConversationRepository | undefined = undefined;
const logger = new Logger('GatewayManager');

/**
 * Initialize the Gateway resources and configuration
 * This should be called at cold start time (outside handlers)
 */
export const initializeGateway = async (options?: {
  configSource?: string;
  configPath?: string;
  awsRegion?: string;
}): Promise<void> => {
  try {
    // Set configuration options
    configSource = options?.configSource || 'local';
    configPath = options?.configPath;
    
    // Initialize config repository if needed
    if (!configRepository) {
      logger.info('Creating default config repository');
      configRepository = new LocalConfigLoader(configPath);
    }
    
    // Initialize conversation repository if needed
    if (!conversationRepository) {
      // Use DynamoDB by default
      logger.info('Creating default conversation repository');
      conversationRepository = new DynamoConversationRepository();
    }
    
    // Reset the gateway instance to force recreation with new settings
    gatewayInstance = null;
    
    // Create a new gateway instance with the settings
    const gateway = getGateway();
    
    // Initialize the gateway
    await gateway.initialize(configSource);
    
    logger.info('Gateway manager initialized successfully', {
      configSource,
      configPath
    });
  } catch (error) {
    logger.error('Failed to initialize gateway manager', { error });
    throw error;
  }
};

/**
 * Get Gateway instance (creates if not exists)
 * Uses module-level variables for Lambda reuse
 */
export const getGateway = (): Gateway => {
  if (!gatewayInstance) {
    // Create config repository if not provided
    if (!configRepository) {
      logger.info('Creating default config repository');
      configRepository = new LocalConfigLoader(configPath);
    }
    
    // Create conversation repository if not provided
    if (!conversationRepository) {
      logger.info('Creating default conversation repository');
      conversationRepository = new DynamoConversationRepository();
    }
    
    logger.info('Creating new Gateway instance', { 
      configSource,
      configPath 
    });
    
    gatewayInstance = new Gateway({
      configRepositorySource: configSource,
      configRepository: configRepository,
      conversationRepositoryImpl: conversationRepository,
      configPath
    });
  }
  
  return gatewayInstance;
};

/**
 * Set a custom conversation repository implementation
 * This should be called before initializing the gateway
 */
export const setConversationRepository = (repository: ConversationRepository): void => {
  conversationRepository = repository;
  
  // Reset the gateway to ensure it uses the new repository
  gatewayInstance = null;
  
  logger.info('Custom conversation repository set');
};

/**
 * Set a custom config repository implementation
 * This should be called before initializing the gateway
 */
export const setConfigRepository = (repository: ConfigRepository): void => {
  configRepository = repository;
  
  // Reset the gateway to ensure it uses the new repository
  gatewayInstance = null;
  
  logger.info('Custom config repository set');
}; 