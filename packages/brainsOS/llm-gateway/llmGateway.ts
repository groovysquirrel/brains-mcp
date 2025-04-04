import { Logger } from '../handlers/shared/logging/logger';
import { ProviderAdapter, ChatRequest, ChatResponse, Provider, ModelId, LLMGatewayConfig } from './types';
import { BedrockAdapter } from './providers/bedrock/bedrockAdapter';
import { OpenAIAdapter } from './providers/openAi/openaiAdapter';

const logger = new Logger('LLMGateway');

/**
 * LLMGateway handles communication with LLM providers.
 * 
 * TODO: Support both streaming and message APIs for Bedrock:
 * - Currently using Messages API for Claude 3
 * - Need to add support for streaming API for other models
 * - Consider adding a configuration option to choose between APIs
 * - Update model configurations to specify which API to use
 */
export class LLMGateway {
  private providers: Map<Provider, ProviderAdapter> = new Map();
  private initialized = false;

  constructor(private config: LLMGatewayConfig) {}

  /**
   * Initializes the LLM Gateway with the configured providers.
   * This must be called before using any provider.
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Initialize Bedrock if configured
      if (this.config.bedrock) {
        const bedrockAdapter = new BedrockAdapter();
        await bedrockAdapter.initialize(this.config.bedrock);
        this.providers.set('bedrock', bedrockAdapter);
      }

      // Initialize OpenAI if configured
      if (this.config.openai) {
        const openaiAdapter = new OpenAIAdapter();
        await openaiAdapter.initialize(this.config.openai);
        this.providers.set('openai', openaiAdapter);
      }

      this.initialized = true;
      logger.info('LLM Gateway initialized successfully', {
        providers: Array.from(this.providers.keys())
      });
    } catch (error) {
      logger.error('Failed to initialize LLM Gateway:', {
        error,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Gets the appropriate provider adapter for the given model ID.
   */
  private getProviderForModel(modelId: ModelId): ProviderAdapter {
    // Determine provider from model ID
    let provider: Provider;
    if (modelId.startsWith('anthropic.')) {
      provider = 'bedrock';
    } else if (modelId.startsWith('gpt-')) {
      provider = 'openai';
    } else if (modelId.startsWith('claude-')) {
      provider = 'anthropic';
    } else {
      throw new Error(`Unsupported model ID: ${modelId}`);
    }

    const adapter = this.providers.get(provider);
    if (!adapter) {
      throw new Error(`Provider ${provider} not initialized`);
    }

    return adapter;
  }

  /**
   * Sends a chat request to the appropriate provider.
   */
  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.initialized) {
      throw new Error('LLM Gateway not initialized');
    }

    const adapter = this.getProviderForModel(request.modelConfig.modelId);
    return adapter.chat(request);
  }

  /**
   * Streams a chat response from the appropriate provider.
   */
  async *streamChat(request: ChatRequest): AsyncGenerator<ChatResponse> {
    if (!this.initialized) {
      throw new Error('LLM Gateway not initialized');
    }

    const adapter = this.getProviderForModel(request.modelConfig.modelId);
    yield* adapter.streamChat(request);
  }

  /**
   * Gets the capabilities of a specific model.
   */
  async getModelCapabilities(modelId: ModelId): Promise<{
    supportsStreaming: boolean;
    inputModalities: string[];
    outputModalities: string[];
  }> {
    if (!this.initialized) {
      throw new Error('LLM Gateway not initialized');
    }

    const adapter = this.getProviderForModel(modelId);
    return adapter.getModelCapabilities(modelId);
  }
} 