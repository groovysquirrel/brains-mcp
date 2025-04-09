import { Logger } from './utils/logging/Logger';
import { GatewayRequest } from './types/Request';
import { GatewayResponse } from './types/Response';
import { ModelConfig } from './types/Model';
import { ConfigRepository } from './repositories/config/ConfigRepository';
import { LocalConfigLoader } from './repositories/config/LocalLoader';
import { ConversationRepository } from './repositories/conversation/ConversationRepository';
import { DynamoConversationRepository } from './repositories/conversation/DynamoConversationRepository';
import { Conversation, ListConversationsResponse } from './types/Conversation';
import { MetricsConfig, MetricsDestination } from './types/Metrics';
import { initializeMetricsCollector } from './utils/MetricsCollector';
import * as ConversationManager from './core/ConversationManager';
import * as MetricsManager from './core/MetricsManager';
import * as RequestProcessor from './core/RequestProcessor';

// Global variables for Lambda reuse
// Cache model configs and ready model lists to reduce database/filesystem queries
const modelCache: Record<string, ModelConfig> = {};
const readyModelsCache: Record<string, { models: ModelConfig[], timestamp: number }> = {};
// Cache TTL of 5 minutes (300000 ms) for ready models list
const CACHE_TTL = 300000;

/**
 * ARCHITECTURE OVERVIEW
 * 
 * The LLM Gateway follows a hierarchical architecture with clear separation of concerns:
 * 
 * 1. PROVIDERS (e.g., AWS Bedrock)
 *    - The platform or service that hosts the AI models
 *    - Handles authentication, API endpoints, and service-specific features
 *    - Example: AWS Bedrock provides access to various AI models through their API
 * 
 * 2. VENDORS (e.g., Anthropic, OpenAI)
 *    - The companies that create and train the AI models
 *    - Define the model's capabilities, pricing, and terms of use
 *    - Example: Anthropic creates Claude models, OpenAI creates GPT models
 * 
 * 3. MODELS (e.g., Claude 3 Sonnet)
 *    - The specific AI model implementation
 *    - Defines the model's size, capabilities, and performance characteristics
 *    - Example: Claude 3 Sonnet is a specific model from Anthropic
 * 
 * 4. MODALITIES (e.g., text-to-text, image-to-text)
 *    - The type of input/output the model can handle
 *    - Defines how to process different types of requests
 *    - Example: text-to-text handles converting text input to text output
 * 
 * This architecture allows us to:
 * - Mix and match different providers, vendors, and models
 * - Add new capabilities without changing existing code
 * - Maintain clear separation between different components
 * - Scale the system by adding new providers or vendors
 */

// Add helper functions to work with the cache
/**
 * Gets a model from cache or loads it if not cached
 * Exported for testing only - not intended for external use
 */
export const getModelWithCache = async (
  modelId: string, 
  provider: string, 
  configRepository: ConfigRepository
): Promise<ModelConfig> => {
  const cacheKey = `${provider}:${modelId}`;
  
  // Check if model is in the cache
  if (modelCache[cacheKey]) {
    return modelCache[cacheKey];
  }
  
  // Load model and store in cache
  const model = await configRepository.getModelConfig(modelId, provider);
  modelCache[cacheKey] = model;
  return model;
};

/**
 * Clears all caches - useful for testing or forced refresh
 * Exported for testing only - not intended for external use
 */
export const clearGatewayCaches = (): void => {
  // Clear model cache
  Object.keys(modelCache).forEach(key => delete modelCache[key]);
  
  // Clear ready models cache
  Object.keys(readyModelsCache).forEach(key => delete readyModelsCache[key]);
};

/**
 * Re-export conversation types for API compatibility
 */
export type { 
  ConversationOptions, 
  ConversationGatewayResponse 
} from './core/ConversationManager';

/**
 * The Gateway class is the main entry point for our LLM (Large Language Model) service.
 * It provides:
 * 1. Text and chat capabilities with various LLMs
 * 2. Streaming and non-streaming responses
 * 3. Conversation management (saving history, continuing conversations)
 * 
 * This implementation is optimized for serverless environments, using:
 * - Module-level singletons for shared resources
 * - Proper cold-start initialization
 * - Async non-blocking operations where possible
 * - Clear separation of concerns via manager modules
 */
export class Gateway {
  private logger: Logger;
  private configSource: string;
  private configRepository: ConfigRepository;
  private conversationRepository: ConversationRepository;

  /**
   * Constructor: Called when we create a new Gateway instance
   * Sets up our initial state
   */
  constructor(options?: {
    configRepositorySource?: string;
    configRepository?: ConfigRepository;
    conversationRepositoryImpl?: ConversationRepository;
    configPath?: string;
  }) {
    this.logger = new Logger('Gateway');
    this.configSource = options?.configRepositorySource || 'local';
    
    // Use provided config repository or create a new one
    this.configRepository = options?.configRepository || new LocalConfigLoader(options?.configPath);
    
    // Initialize conversation repository
    // In serverless environments, we want to reuse the repository if possible
    this.conversationRepository = options?.conversationRepositoryImpl || new DynamoConversationRepository();
    
    // Initialize the conversation manager with our repository
    ConversationManager.initializeConversationManager(this.conversationRepository);
    
    // Initialize metrics collector with metrics config from repository
    this.initializeMetricsCollector();
    
    this.logger.info('Gateway initialized', { 
      configSource: this.configSource
    });
  }

  /**
   * Initialize the logger with configuration from repository
   */
  private async initializeLogger(): Promise<void> {
    try {
      const loggerConfig = await this.configRepository.getLoggerConfig();
      Logger.setLogLevel(loggerConfig.logLevel);
      this.logger.info('Logger initialized with configured log level', { 
        logLevel: loggerConfig.logLevel 
      });
    } catch (error) {
      this.logger.error('Failed to initialize logger with config', { error });
      // Default level is already set by Logger constructor
    }
  }

  /**
   * Initialize the metrics collector with configuration from repository
   */
  private async initializeMetricsCollector(): Promise<void> {
    try {
      const metricsConfig = await this.configRepository.getMetricsConfig();
      initializeMetricsCollector(metricsConfig);
    } catch (error) {
      this.logger.error('Failed to initialize metrics collector', { error });
      // Use default config if loading fails
      const defaultConfig: MetricsConfig = {
        enabled: false,
        destination: MetricsDestination.NONE
      };
      initializeMetricsCollector(defaultConfig);
    }
  }

  /**
   * Initializes the gateway with the specified configuration source
   * @param source - Where to load configurations from ('local' or 'dynamodb')
   */
  async initialize(source: string): Promise<void> {
    try {
      this.configSource = source;
      
      // Don't replace the repository if it was passed from the outside
      if (!this.configRepository || this.configRepository instanceof LocalConfigLoader) {
        // Create the appropriate config repository based on source
        if (source.toLowerCase() === 'local') {
          this.configRepository = new LocalConfigLoader();
        } else if (source.toLowerCase() === 'dynamodb') {
          throw new Error('DynamoDB configuration source not implemented yet');
        } else {
          throw new Error(`Unknown configuration source: ${source}`);
        }
      }
      
      // Initialize logger first so that subsequent logs use the configured level
      await this.initializeLogger();
      
      // Then initialize metrics collector with updated config repository
      await this.initializeMetricsCollector();
      
      this.logger.info('Gateway initialized successfully with source:', { source });
    } catch (error: any) {
      this.logger.error('Failed to initialize gateway:', {
        error
      });
      throw error;
    }
  }

  /**
   * Gets model configuration with caching for better Lambda reuse
   * @param modelId - The model ID
   * @param provider - The provider name
   * @returns ModelConfig
   */
  private async getCachedModelConfig(modelId: string, provider: string): Promise<ModelConfig> {
    return getModelWithCache(modelId, provider, this.configRepository);
  }

  /**
   * Handles a chat request (non-streaming)
   * @param request - The user's request
   * @returns The AI's response
   */
  async chat(request: GatewayRequest): Promise<GatewayResponse> {
    // Track starting time for metrics
    const startTime = Date.now();
    
    try {
      // Validate the request
      RequestProcessor.validateRequest(request);

      // Normalize the request (e.g., convert modalities)
      const normalizedRequest = RequestProcessor.normalizeRequest(request);

      // Load conversation history if a conversation ID is provided
      const enrichedRequest = await ConversationManager.loadConversationHistory(normalizedRequest);

      // Get model config with caching
      const model = await this.getCachedModelConfig(enrichedRequest.modelId!, enrichedRequest.provider!);
      
      // Get appropriate modality handler
      const handler = await this.configRepository.getModalityHandler(model);
      
      // Process the request
      const response = await handler.process(enrichedRequest, model);
      
      // Save the conversation exchange if tracking is enabled
      await ConversationManager.saveConversationExchange(request, response);
      
      // Track usage metrics (guess the source as api if not specified)
      const source = request.source || 'api';
      await MetricsManager.trackUsageMetrics(request, response, source, startTime, model);
      
      return response;
    } catch (error: any) {
      // Log the error
      this.logger.error('Error in chat method:', {
        error,
        errorMessage: error.message,
        userId: request.userId,
        modelId: request.modelId
      });
      
      // Track error metrics
      const source = request.source || 'api';
      await MetricsManager.trackErrorMetrics(request, error, source, startTime);
      
      throw error;
    }
  }

  /**
   * Handles a streaming chat request
   * This is like a regular chat, but the response comes in pieces
   * @param request - The user's request
   * @returns A stream of responses
   */
  async *streamChat(request: GatewayRequest): AsyncGenerator<GatewayResponse> {
    // Track starting time for metrics
    const startTime = Date.now();
    
    try {
      // Validate the request
      RequestProcessor.validateRequest(request);

      // Normalize the request (e.g., convert modalities)
      const normalizedRequest = RequestProcessor.normalizeRequest(request);

      // Load conversation history if a conversation ID is provided
      const enrichedRequest = await ConversationManager.loadConversationHistory(normalizedRequest);

      // Get model config with caching
      const model = await this.getCachedModelConfig(enrichedRequest.modelId!, enrichedRequest.provider!);
      
      // Get appropriate modality handler
      const handler = await this.configRepository.getModalityHandler(model);
      
      // Create variables to track the full response for saving to conversation
      let fullContent = '';
      let lastMetadata: Record<string, unknown> | undefined;
      
      // Process the request and yield each chunk
      for await (const chunk of handler.streamProcess(enrichedRequest, model)) {
        // Accumulate the content
        fullContent += chunk.content;
        
        // Update the metadata (taking the last one)
        if (chunk.metadata) {
          lastMetadata = chunk.metadata;
        }
        
        // Yield the chunk
        yield chunk;
      }
      
      // Create a consolidated response to save
      const consolidatedResponse: GatewayResponse = {
        content: fullContent,
        metadata: lastMetadata
      };
      
      // Save the conversation exchange if tracking is enabled
      await ConversationManager.saveConversationExchange(request, consolidatedResponse);
      
      // Track usage metrics (guess the source as api if not specified)
      const source = request.source || 'api';
      await MetricsManager.trackUsageMetrics(request, consolidatedResponse, source, startTime, model);
    } catch (error: any) {
      // Log the error
      this.logger.error('Error in streamChat method:', {
        error,
        errorMessage: error.message,
        userId: request.userId,
        modelId: request.modelId
      });
      
      // Track error metrics
      const source = request.source || 'api';
      await MetricsManager.trackErrorMetrics(request, error, source, startTime);
      
      throw error;
    }
  }

  /**
   * Gets all models that are ready for use (status: "READY")
   * Uses cache with TTL for better Lambda reuse
   * @param providerName - Optional provider name to filter models
   * @param vendorName - Optional vendor name to filter models
   * @returns Array of ready model configurations
   */
  async getReadyModels(providerName?: string, vendorName?: string): Promise<ModelConfig[]> {
    const provider = providerName || 'bedrock';
    const cacheKey = `${provider}:${vendorName || 'all'}`;
    
    // Check if we have a valid cache entry
    const cacheEntry = readyModelsCache[cacheKey];
    if (cacheEntry && (Date.now() - cacheEntry.timestamp) < CACHE_TTL) {
      return cacheEntry.models;
    }
    
    // No valid cache, load from source
      const readyModels: ModelConfig[] = [];
      
      // Load status config
    const statusConfig = await this.configRepository.getStatusConfig(provider);
      const readyStatus = statusConfig.statuses.find(s => s.status === "READY");
      
      if (readyStatus) {
        // Get ONDEMAND models
        const ondemandConnection = readyStatus.connections?.find(c => c.type === "ONDEMAND");
        if (ondemandConnection) {
          for (const vendor of ondemandConnection.vendors) {
            if (vendorName && vendor.name !== vendorName) continue;
            
            for (const model of vendor.models) {
            const modelConfig = await this.getCachedModelConfig(model.modelId, provider);
              readyModels.push(modelConfig);
            }
          }
        }
      }
    
    // Cache the results
    readyModelsCache[cacheKey] = {
      models: readyModels,
      timestamp: Date.now()
    };
      
      return readyModels;
    }

  // Conversation management methods - delegated to ConversationManager

  /**
   * Creates a new conversation
   */
  async createConversation(options: ConversationManager.ConversationOptions): Promise<{ conversationId: string; isNew: boolean }> {
    return ConversationManager.createConversation(options);
  }

  /**
   * Retrieves a conversation
   */
  async getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
    return ConversationManager.getConversation(userId, conversationId);
  }

  /**
   * Lists conversations for a user
   */
  async listConversations(userId: string, limit?: number, nextToken?: string): Promise<ListConversationsResponse> {
    return ConversationManager.listConversations(userId, limit, nextToken);
  }

  /**
   * Deletes a conversation
   */
  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    return ConversationManager.deleteConversation(userId, conversationId);
  }

  /**
   * Adds a message to a conversation
   */
  async addMessageToConversation(
    userId: string,
    conversationId: string,
    message: ConversationManager.ConversationMessage
  ): Promise<Conversation> {
    return ConversationManager.addMessageToConversation(userId, conversationId, message);
  }

  /**
   * Handles a chat request with automatic conversation management
   */
  async conversationChat(
    request: GatewayRequest & ConversationManager.ConversationOptions
  ): Promise<ConversationManager.ConversationGatewayResponse> {
    // Track starting time for metrics
    const startTime = Date.now();
    
    try {
    // Ensure required fields
    if (!request.userId) {
      throw new Error('userId is required for conversation management');
    }

    // Create or validate conversation
    const { conversationId, isNew } = await this.createConversation({
      userId: request.userId,
      conversationId: request.conversationId,
      title: request.title as string,
      metadata: request.metadata as Record<string, any>
    });

    // Add conversationId to request for history loading
    const enrichedRequest: GatewayRequest = {
      ...request,
      conversationId
    };

    // Process chat with conversation history only - no automatic saving
    // We'll manually save messages to avoid duplication
      const normalizedRequest = RequestProcessor.normalizeRequest(enrichedRequest);
      const modifiedRequest = await ConversationManager.loadConversationHistory(normalizedRequest);
    
      // Get model config with caching
      const model = await this.getCachedModelConfig(modifiedRequest.modelId!, modifiedRequest.provider!);
    
    // Get appropriate modality handler
      const handler = await this.configRepository.getModalityHandler(model);
    
    // Process the request
    const response = await handler.process(modifiedRequest, model);

    // Add user message to conversation if it's a new one or not provided in request
    if (request.messages && request.messages.length > 0) {
      const userMessage = request.messages[request.messages.length - 1];
      await this.addMessageToConversation(
        request.userId,
        conversationId,
        {
          role: userMessage.role,
          content: userMessage.content,
          timestamp: Date.now()
        }
      );
    } else if (request.prompt) {
      await this.addMessageToConversation(
        request.userId,
        conversationId,
        {
          role: 'user',
          content: request.prompt,
          timestamp: Date.now()
        }
      );
    }

    // Add assistant response to conversation
    await this.addMessageToConversation(
      request.userId,
      conversationId,
      {
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: response.metadata
      }
    );
      
      // Track usage metrics
      const source = request.source || 'api';
      await MetricsManager.trackUsageMetrics(request, response, source, startTime, model);

    // Return response with conversation ID
    return {
      ...response,
      conversationId
      } as ConversationManager.ConversationGatewayResponse;
    } catch (error: any) {
      // Log the error
      this.logger.error('Error in conversationChat method:', {
        error,
        errorMessage: error.message,
        userId: request.userId,
        modelId: request.modelId
      });
      
      // Track error metrics
      const source = request.source || 'api';
      await MetricsManager.trackErrorMetrics(request, error, source, startTime);
      
      throw error;
    }
  }

  /**
   * Handles a streaming chat request with automatic conversation management
   */
  async *conversationStreamChat(
    request: GatewayRequest & ConversationManager.ConversationOptions
  ): AsyncGenerator<ConversationManager.ConversationGatewayResponse, void, unknown> {
    // Track starting time for metrics
    const startTime = Date.now();
    
    try {
    // Ensure required fields
    if (!request.userId) {
      throw new Error('userId is required for conversation management');
    }

    // Create or validate conversation
    const { conversationId, isNew } = await this.createConversation({
      userId: request.userId,
      conversationId: request.conversationId,
      title: request.title as string,
      metadata: request.metadata as Record<string, any>
    });

    // Add conversationId to request for history loading
    const enrichedRequest: GatewayRequest = {
      ...request,
      conversationId
    };

    console.log('!!!! request.messages', request.messages);
    
    // Add user message to conversation
    if (request.messages && request.messages.length > 0) {
      const userMessage = request.messages[request.messages.length - 1];
      await this.addMessageToConversation(
        request.userId,
        conversationId,
        {
          role: userMessage.role,
          content: userMessage.content,
          timestamp: Date.now()
        }
      );
    } else if (request.prompt) {
      await this.addMessageToConversation(
        request.userId, 
        conversationId,
        {
          role: 'user',
          content: request.prompt,
          timestamp: Date.now()
        }
      );
    }

    // Variables to track full response for saving
    let fullContent = '';
    let lastMetadata: Record<string, unknown> | undefined;

    // Process streaming response - doing the loading manually to avoid saving duplicates
      const normalizedRequest = RequestProcessor.normalizeRequest(enrichedRequest);
      const modifiedRequest = await ConversationManager.loadConversationHistory(normalizedRequest);
    
      // Get model config with caching
      const model = await this.getCachedModelConfig(modifiedRequest.modelId!, modifiedRequest.provider!);
    
    // Get appropriate modality handler
      const handler = await this.configRepository.getModalityHandler(model);
    
    // Process the request and stream responses
    for await (const chunk of handler.streamProcess(modifiedRequest, model)) {
      // Accumulate content and update metadata
      fullContent += chunk.content;
      if (chunk.metadata) {
        lastMetadata = chunk.metadata;
      }

      // Yield the chunk with conversationId
      yield {
        ...chunk,
        conversationId
        } as ConversationManager.ConversationGatewayResponse;
    }

    // Add assistant response to conversation
    await this.addMessageToConversation(
      request.userId,
      conversationId,
      {
        role: 'assistant',
        content: fullContent,
        timestamp: Date.now(),
        metadata: lastMetadata
      }
    );
      
      // Track usage metrics
      const source = request.source || 'api';
      const consolidatedResponse: GatewayResponse = {
        content: fullContent,
        metadata: lastMetadata
      };
      await MetricsManager.trackUsageMetrics(request, consolidatedResponse, source, startTime, model);
    } catch (error: any) {
      // Log the error
      this.logger.error('Error in conversationStreamChat method:', {
        error,
        errorMessage: error.message,
        userId: request.userId,
        modelId: request.modelId
      });
      
      // Track error metrics
      const source = request.source || 'api';
      await MetricsManager.trackErrorMetrics(request, error, source, startTime);
      
      throw error;
    }
  }
} 
