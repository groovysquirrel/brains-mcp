import { Logger } from '../../../handlers/shared/logging/logger';
import { ProviderAdapter, ChatRequest, ChatResponse, ProviderConfig, ModelId } from '../../types';

const logger = new Logger('OpenAIAdapter');

export class OpenAIAdapter implements ProviderAdapter {
  private initialized = false;

  async initialize(config: ProviderConfig): Promise<void> {
    if (this.initialized) {
      return;
    }

    try {
      // Validate required configuration
      if (!config.apiKey) {
        throw new Error('OpenAI API key is required');
      }

      this.initialized = true;
      logger.info('OpenAI adapter initialized successfully');
    } catch (error) {
      logger.error('Failed to initialize OpenAI adapter:', {
        error,
        stack: error.stack
      });
      throw error;
    }
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    if (!this.initialized) {
      throw new Error('OpenAI adapter not initialized');
    }

    // Return a mock response for testing
    return {
      content: `[Mock OpenAI Response] ${request.messages[request.messages.length - 1].content}`,
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      },
      metadata: {
        model: request.modelConfig.modelId,
        provider: 'openai'
      }
    };
  }

  async *streamChat(request: ChatRequest): AsyncGenerator<ChatResponse> {
    if (!this.initialized) {
      throw new Error('OpenAI adapter not initialized');
    }

    // Return a mock streaming response for testing
    const mockContent = `[Mock OpenAI Stream] ${request.messages[request.messages.length - 1].content}`;
    const chunks = mockContent.split(' ');

    for (const chunk of chunks) {
      yield {
        content: chunk + ' ',
        usage: {
          promptTokens: 10,
          completionTokens: 5,
          totalTokens: 15
        },
        metadata: {
          model: request.modelConfig.modelId,
          provider: 'openai',
          isStreaming: true
        }
      };
      // Add a small delay to simulate streaming
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  async getModelCapabilities(modelId: ModelId): Promise<{
    supportsStreaming: boolean;
    inputModalities: string[];
    outputModalities: string[];
  }> {
    if (!this.initialized) {
      throw new Error('OpenAI adapter not initialized');
    }

    // Return mock capabilities for testing
    return {
      supportsStreaming: true,
      inputModalities: ['text'],
      outputModalities: ['text']
    };
  }
} 