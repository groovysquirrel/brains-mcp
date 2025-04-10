import { AbstractVendor } from './AbstractVendor';
import { GatewayRequest } from '../../types/Request';
import { VendorConfig } from '../../types/Vendor';
import { ProviderConfig } from '../../types/Provider';
import { ModelConfig } from '../../types/Model';
import { GatewayResponse } from '../../types/Response';

export class MetaVendor extends AbstractVendor {
  constructor(config: VendorConfig, providerConfig: ProviderConfig) {
    super(config, providerConfig);
  }

  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown> {
    if (!request.messages) {
      throw new Error('Messages are required for Llama models');
    }

    const defaultSettings = this.getDefaultSettings();
    
    // Format messages according to Llama's expectations
    const promptMessages = [];
    let systemPrompt = '';
    
    // Extract system prompt if present
    for (const message of request.messages) {
      if (message.role === 'system') {
        systemPrompt = message.content;
      } else {
        promptMessages.push(message);
      }
    }
    
    // Override with explicit system prompt if provided
    if (request.systemPrompt) {
      systemPrompt = request.systemPrompt;
    }
    
    // Build the request body
    const requestBody: Record<string, unknown> = {
      prompt: this.formatMessages(promptMessages, systemPrompt),
      max_gen_len: request.maxTokens || defaultSettings.maxTokens,
      temperature: request.temperature || defaultSettings.temperature,
      top_p: request.topP || defaultSettings.topP
    };
    
    // Add any stop sequences
    if (request.stopSequences && request.stopSequences.length > 0) {
      requestBody.stop_sequences = request.stopSequences;
    } else if (defaultSettings.stopSequences) {
      requestBody.stop_sequences = defaultSettings.stopSequences;
    }
    
    return requestBody;
  }
  
  // Helper method to format messages in the expected format for Llama models
  private formatMessages(messages: Array<{role: string; content: string}>, systemPrompt?: string): string {
    let prompt = '';
    
    // Add system prompt if present
    if (systemPrompt) {
      prompt += `<|system|>\n${systemPrompt}\n`;
    }
    
    // Add the conversation messages
    for (const message of messages) {
      const role = message.role === 'assistant' ? 'assistant' : 'user';
      prompt += `<|${role}|>\n${message.content}\n`;
    }
    
    // Add the final assistant marker to indicate it's the model's turn
    prompt += '<|assistant|>\n';
    
    return prompt;
  }

  validateRequest(request: GatewayRequest): void {
    if ((!request.messages || request.messages.length === 0) && !request.prompt) {
      throw new Error('Either messages or prompt are required for Llama models');
    }
    
    // If using messages format, ensure the roles are valid
    if (request.messages) {
      for (const message of request.messages) {
        if (!['user', 'assistant', 'system'].includes(message.role)) {
          throw new Error(`Invalid role "${message.role}" for Llama models. Must be one of: user, assistant, system`);
        }
      }
    }
  }

  processStreamChunk(chunk: unknown, modelId: string): { content: string; metadata?: Record<string, unknown> } | null {
    const chunkObj = chunk as { type?: string; generation?: string };
    
    // Check if this is a data chunk with a generation field
    if (chunkObj.type === 'content_block_start' || chunkObj.type === 'content_block_delta') {
      return {
        content: '',
        metadata: {
          model: modelId,
          isStreaming: true
        }
      };
    } else if (chunkObj.type === 'generation' && chunkObj.generation) {
      return {
        content: chunkObj.generation,
        metadata: {
          model: modelId,
          isStreaming: true
        }
      };
    } else if (chunkObj.type === 'message_stop') {
      // Final chunk with usage information
      return {
        content: '',
        metadata: {
          model: modelId,
          isStreaming: false
        }
      };
    }
    
    // If it's not a recognized chunk type, return null to skip it
    return null;
  }

  getDefaultSettings() {
    return this.config.defaultSettings || {
      maxTokens: 512,
      temperature: 0.7,
      topP: 0.9
    };
  }

  getApiFormat(modelId: string): string {
    return 'chat';
  }

  formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> } {
    const responseObj = response as Record<string, unknown>;
    const generation = responseObj.generation as string;
    
    return {
      content: generation || '',
      metadata: {
        model: responseObj.model,
        usage: responseObj.usage
      }
    };
  }

  async process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse> {
    throw new Error('Method not implemented.');
  }
} 