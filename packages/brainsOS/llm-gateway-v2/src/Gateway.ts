import { Logger } from './utils/logging/Logger';
import { GatewayRequest } from './types/Request';
import { GatewayResponse } from './types/Response';
import { TextModalityHandler } from './core/modalities/TextModalityHandler';
import { ProviderConfig } from './types/Provider';
import { VendorConfig } from './types/Vendor';
import { ModelConfig } from './types/Model';
import { ModalityConfig, ModalityHandler } from './types/Modality';
import { ConfigRepository } from './repositories/config/ConfigRepository';
import { LocalConfigLoader } from './repositories/config/LocalLoader';
import { ConversationRepository } from './repositories/conversation/ConversationRepository';
import { DynamoConversationRepository } from './repositories/conversation/DynamoConversationRepository';
import { ConversationMessage, Conversation, ListConversationsResponse } from './repositories/conversation/ConversationTypes';
import { v4 as uuidv4 } from 'uuid';

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

/**
 * ConversationOptions interface for creating/managing conversations
 */
export interface ConversationOptions {
  userId: string;
  conversationId?: string;  // If not provided, a new one will be generated
  title?: string;
  metadata?: Record<string, any>;
}

/**
 * Extend the GatewayResponse type to include conversationId
 */
export interface ConversationGatewayResponse extends GatewayResponse {
  conversationId: string;
}

/**
 * The Gateway class is the main entry point for our LLM (Large Language Model) service.
 * It provides:
 * 1. Text and chat capabilities with various LLMs
 * 2. Streaming and non-streaming responses
 * 3. Conversation management (saving history, continuing conversations)
 */
export class Gateway {
  private logger: Logger;
  private configSource: string;
  private configRepository: ConfigRepository;
  private conversationRepository: ConversationRepository;
  private providerConfig!: ProviderConfig;
  private vendorConfigs!: Record<string, VendorConfig>;

  /**
   * Constructor: Called when we create a new Gateway instance
   * Sets up our initial state
   */
  constructor(options?: {
    configRepositorySource?: string;
    conversationRepositoryImpl?: ConversationRepository;
    configPath?: string;
  }) {
    this.logger = new Logger('LLM Gateway');
    this.configSource = options?.configRepositorySource || 'local';
    
    // Create the config repository
    this.configRepository = new LocalConfigLoader(options?.configPath);
    
    // Initialize conversation repository
    // In serverless environments, we want to reuse the repository if possible
    this.conversationRepository = options?.conversationRepositoryImpl || new DynamoConversationRepository();
    
    this.logger.info('Gateway initialized', { 
      configSource: this.configSource
    });
  }

  /**
   * Checks if a given string is likely an alias rather than a model ID
   * This is a heuristic check - model IDs typically follow the pattern: vendor.model-name-version
   */
  private isLikelyAlias(id: string): boolean {
    return !id.includes('.');
  }

  /**
   * Initializes the gateway with the specified configuration source
   * @param source - Where to load configurations from ('local' or 'dynamodb')
   */
  async initialize(source: string): Promise<void> {
    try {
      this.configSource = source;
      
      // Create the appropriate config repository based on source
      if (source.toLowerCase() === 'local') {
        this.configRepository = new LocalConfigLoader();
      } else if (source.toLowerCase() === 'dynamodb') {
        throw new Error('DynamoDB configuration source not implemented yet');
      } else {
        throw new Error(`Unknown configuration source: ${source}`);
      }
      
      // Load vendor configs
      this.vendorConfigs = await this.configRepository.loadAllVendorConfigs();
      
      this.logger.info('Gateway initialized successfully with source:', { source });
    } catch (error: any) {
      this.logger.error('Failed to initialize gateway:', {
        error
      });
      throw error;
    }
  }

  /**
   * If a conversation ID is provided, loads the conversation history and prepends it to the request messages
   * @param request - The user's request
   * @returns The modified request with conversation history added if applicable
   */
  private async loadConversationHistory(request: GatewayRequest): Promise<GatewayRequest> {
    const { conversationId, userId } = request;
    
    // If no conversation ID or user ID, return the request as is
    if (!conversationId || !userId) {
      return request;
    }
    
    try {
      // Load the conversation
      const conversation = await this.conversationRepository.getConversation({
        userId,
        conversationId
      });
      
      // If conversation not found, return the request as is
      if (!conversation) {
        return request;
      }
      
      // Convert the conversation messages to the format expected by the LLM
      const historyMessages = conversation.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Combine the history with the current message
      if (request.messages && request.messages.length > 0) {
        // When we have messages array, append the new message to the history
        return {
          ...request,
          messages: [...historyMessages, ...request.messages]
        };
      } else if (request.prompt) {
        // When we have a prompt (legacy), create a new message array
        return {
          ...request,
          messages: [
            ...historyMessages,
            { role: 'user', content: request.prompt }
          ],
          // Remove the prompt to avoid confusion
          prompt: undefined
        };
      } else {
        // No messages or prompt, just use the history
        return {
          ...request,
          messages: historyMessages
        };
      }
    } catch (error: any) {
      this.logger.error('Failed to load conversation history', {
        error,
        userId,
        conversationId
      });
      
      // If there's an error loading the history, continue with the original request
      return request;
    }
  }

  /**
   * Saves a chat exchange to the conversation repository
   * @param request - The original request
   * @param response - The response from the LLM
   */
  private async saveConversationExchange(request: GatewayRequest, response: GatewayResponse): Promise<void> {
    const { conversationId, userId } = request;
    
    // If no conversation tracking info provided, don't save
    if (!conversationId || !userId) {
      return;
    }
    
    try {
      // Check if this is a new or existing conversation
      const exists = await this.conversationRepository.conversationExists(userId, conversationId);
      
      // Messages to save (request and response)
      const messages: ConversationMessage[] = [];
      
      // Add user message
      if (request.messages && request.messages.length > 0) {
        // Get the last message from the user (the most recent one)
        const userMessage = request.messages[request.messages.length - 1];
        messages.push({
          role: userMessage.role,
          content: userMessage.content,
          timestamp: Date.now()
        });
      } else if (request.prompt) {
        // Handle legacy prompt
        messages.push({
          role: 'user',
          content: request.prompt,
          timestamp: Date.now()
        });
      }
      
      // Add assistant response
      messages.push({
        role: 'assistant',
        content: response.content,
        timestamp: Date.now(),
        metadata: response.metadata
      });
      
      if (exists) {
        // Add messages to existing conversation
        await this.conversationRepository.addMessages(userId, conversationId, messages);
      } else {
        // Create new conversation
        await this.conversationRepository.createConversation({
          userId,
          conversationId,
          initialMessages: messages,
          metadata: request.metadata as Record<string, any>
        });
      }
      
      this.logger.info('Saved conversation exchange', { userId, conversationId });
    } catch (error: any) {
      this.logger.error('Failed to save conversation exchange', {
        error,
        userId,
        conversationId
      });
      // Continue execution even if saving fails
    }
  }

  private async createModalityHandler(config: ModalityConfig): Promise<ModalityHandler> {
    // Load provider and vendor configs if needed
    if (!this.providerConfig) {
      this.providerConfig = await this.configRepository.getProviderConfig('bedrock');
    }
    if (!this.vendorConfigs) {
      this.vendorConfigs = await this.configRepository.loadAllVendorConfigs();
    }

    switch (config.name) {
      case 'text-to-text':
        return new TextModalityHandler(config, this.providerConfig, this.vendorConfigs);
      // Add other modality handlers here
      default:
        throw new Error(`Unsupported modality: ${config.name}`);
    }
  }

  private async getModalityHandler(model: ModelConfig): Promise<ModalityHandler> {
    // Load modality configurations
    const modalityConfigs = await this.configRepository.loadAllModalityConfigs();
    
    // Find a handler that supports the model's modalities
    for (const config of modalityConfigs) {
      const handler = await this.createModalityHandler(config);
      
      // Check if the handler supports the model's modalities
      if (handler.supportsModality(model)) {
        // For text modality, we need to check if the model supports text input and output
        if (config.name === 'text-to-text' && 
            model.capabilities.modalities.input.includes('TEXT') && 
            model.capabilities.modalities.output.includes('TEXT')) {
          return handler;
        }
      }
    }
    
    throw new Error(`No modality handler found for model ${model.modelId}`);
  }

  /**
   * Validates required fields in the request
   * @param request - The user's request
   */
  private validateRequest(request: GatewayRequest): void {
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
  }

  /**
   * Handles a chat request (non-streaming)
   * @param request - The user's request
   * @returns The AI's response
   */
  async chat(request: GatewayRequest): Promise<GatewayResponse> {
    // Validate the request
    this.validateRequest(request);

    // Convert simple "text" modality to "text-to-text"
    if (request.modality === 'text') {
      request.modality = 'text-to-text';
    }

    // Load conversation history if a conversation ID is provided
    const enrichedRequest = await this.loadConversationHistory(request);

    // Get model config
    const model = await this.configRepository.getModelConfig(request.modelId!, request.provider!);
    
    // Get appropriate modality handler
    const handler = await this.getModalityHandler(model);
    
    // Process the request
    const response = await handler.process(enrichedRequest, model);
    
    // Save the conversation exchange if tracking is enabled
    await this.saveConversationExchange(request, response);
    
    return response;
  }

  /**
   * Handles a streaming chat request
   * This is like a regular chat, but the response comes in pieces
   * @param request - The user's request
   * @returns A stream of responses
   */
  async *streamChat(request: GatewayRequest): AsyncGenerator<GatewayResponse> {
    // Validate the request
    this.validateRequest(request);

    // Convert simple "text" modality to "text-to-text"
    if (request.modality === 'text') {
      request.modality = 'text-to-text';
    }

    // Load conversation history if a conversation ID is provided
    const enrichedRequest = await this.loadConversationHistory(request);

    // Get model config
    const model = await this.configRepository.getModelConfig(request.modelId!, request.provider!);
    
    // Get appropriate modality handler
    const handler = await this.getModalityHandler(model);
    
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
    await this.saveConversationExchange(request, consolidatedResponse);
  }

  /**
   * Gets all models that are ready for use (status: "READY")
   * @param providerName - Optional provider name to filter models
   * @param vendorName - Optional vendor name to filter models
   * @returns Array of ready model configurations
   */
  async getReadyModels(providerName?: string, vendorName?: string): Promise<ModelConfig[]> {
      const readyModels: ModelConfig[] = [];
      
      // Load status config
    const statusConfig = await this.configRepository.getStatusConfig(providerName || 'bedrock');
      const readyStatus = statusConfig.statuses.find(s => s.status === "READY");
      
      if (readyStatus) {
        // Get ONDEMAND models
        const ondemandConnection = readyStatus.connections?.find(c => c.type === "ONDEMAND");
        if (ondemandConnection) {
          for (const vendor of ondemandConnection.vendors) {
            if (vendorName && vendor.name !== vendorName) continue;
            
            for (const model of vendor.models) {
            const modelConfig = await this.configRepository.getModelConfig(model.modelId, providerName || 'bedrock');
              readyModels.push(modelConfig);
            }
          }
        }
      }
      
      return readyModels;
    }

  /**
   * Creates a new conversation
   * @param options - Options for creating the conversation
   * @returns The conversation ID and whether it's new
   */
  async createConversation(options: ConversationOptions): Promise<{ conversationId: string; isNew: boolean }> {
    const { userId, conversationId = uuidv4(), title, metadata = {} } = options;
    
    // Check if conversation already exists
    const exists = await this.conversationRepository.conversationExists(userId, conversationId);
    
    if (!exists) {
      // Create new conversation
      await this.conversationRepository.createConversation({
        userId,
        conversationId,
        metadata: {
          title: title || 'New Conversation',
          createdAt: Date.now(),
          ...metadata
        }
      });
    }
    
    return {
      conversationId,
      isNew: !exists
    };
  }

  /**
   * Retrieves a conversation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @returns The conversation or null if not found
   */
  async getConversation(userId: string, conversationId: string): Promise<Conversation | null> {
    return this.conversationRepository.getConversation({
      userId,
      conversationId
    });
  }

  /**
   * Lists conversations for a user
   * @param userId - The user ID
   * @param limit - Maximum number of conversations to return (optional)
   * @param nextToken - Pagination token (optional)
   * @returns List of conversations and optional next token
   */
  async listConversations(userId: string, limit?: number, nextToken?: string): Promise<ListConversationsResponse> {
    return this.conversationRepository.listConversations({
      userId,
      limit,
      nextToken
    });
  }

  /**
   * Deletes a conversation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @returns true if deleted, false if not found
   */
  async deleteConversation(userId: string, conversationId: string): Promise<boolean> {
    return this.conversationRepository.deleteConversation(userId, conversationId);
  }

  /**
   * Adds a message to a conversation
   * @param userId - The user ID
   * @param conversationId - The conversation ID
   * @param message - The message to add
   * @returns The updated conversation
   */
  async addMessageToConversation(
    userId: string,
    conversationId: string,
    message: ConversationMessage
  ): Promise<Conversation> {
    return this.conversationRepository.addMessage({
      userId,
      conversationId,
      message
    });
  }

  /**
   * Handles a chat request with automatic conversation management
   * Will create a new conversation if conversationId is not provided
   * Will add the request and response to the conversation history
   * 
   * @param request - The chat request with conversation details
   * @returns The response with conversation ID
   */
  async conversationChat(request: GatewayRequest & ConversationOptions): Promise<ConversationGatewayResponse> {
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

    // Process chat with conversation history
    const response = await this.chat(enrichedRequest);

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

    // Return response with conversation ID
    return {
      ...response,
      conversationId
    } as ConversationGatewayResponse;
  }

  /**
   * Handles a streaming chat request with automatic conversation management
   * Will create a new conversation if conversationId is not provided
   * Will add the request and accumulated response to conversation history
   * 
   * @param request - The chat request with conversation details
   * @returns An async generator that yields response chunks
   */
  async *conversationStreamChat(request: GatewayRequest & ConversationOptions): AsyncGenerator<ConversationGatewayResponse, void, unknown> {
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

    // Process streaming response
    for await (const chunk of this.streamChat(enrichedRequest)) {
      // Accumulate content and update metadata
      fullContent += chunk.content;
      if (chunk.metadata) {
        lastMetadata = chunk.metadata;
      }

      // Yield the chunk with conversationId
      yield {
        ...chunk,
        conversationId
      } as ConversationGatewayResponse;
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
  }
} 
