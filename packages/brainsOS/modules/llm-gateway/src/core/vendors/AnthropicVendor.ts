import { AbstractVendor } from './AbstractVendor';
import { GatewayRequest } from '../../types/Request';
import { VendorConfig } from '../../types/Vendor';
import { ProviderConfig } from '../../types/Provider';
import { ModelConfig } from '../../types/Model';
import { GatewayResponse } from '../../types/Response';

export class AnthropicVendor extends AbstractVendor {
  constructor(config: VendorConfig, providerConfig: ProviderConfig) {
    super(config, providerConfig);
  }

  async process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse> {
    throw new Error('Method not implemented.');
  }

  processStreamChunk(chunk: unknown, modelId: string): { content: string; metadata?: Record<string, unknown> } | null {
    const chunkObj = chunk as Record<string, unknown>;
    
    if (chunkObj.type === 'content_block_delta') {
      const content = (chunkObj.delta as Record<string, unknown>).text as string;
      return {
        content,
        metadata: {
          model: modelId,
          isStreaming: true
        }
      };
    } else if (chunkObj.type === 'message_stop') {
      // Extract usage information correctly from Anthropic's format
      const usage = chunkObj.usage as Record<string, unknown> | undefined;
      const promptTokens = usage?.input_tokens || 0;
      const completionTokens = usage?.output_tokens || 0;
      
      this.logger.debug('Stream completed, received usage data:', {
        modelId,
        usage,
        promptTokens,
        completionTokens
      });
      
      return {
        content: '',
        metadata: {
          model: modelId,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens: (promptTokens as number) + (completionTokens as number)
          },
          isStreaming: false
        }
      };
    }
    
    return null;
  }

  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown> {
    if (!request.messages) {
      throw new Error('Messages are required for Claude models');
    }

    const defaultSettings = this.getDefaultSettings();
    
    // Extract system message if present
    let systemPrompt = '';
    const chatMessages = request.messages.filter(msg => {
      if (msg.role === 'system') {
        // Combine multiple system messages if they exist
        systemPrompt += (systemPrompt ? '\n' : '') + msg.content;
        return false;
      }
      return true;
    });
    
    // Use explicit systemPrompt if provided (overrides system messages)
    if (request.systemPrompt) {
      systemPrompt = request.systemPrompt;
    }
    
    // Format messages according to Bedrock's requirements
    // Only include user and assistant messages
    const messages = chatMessages.map(msg => ({
      role: msg.role,
      content: msg.content
    }));
    
    // Ensure the message array starts with a user message
    if (messages.length > 0 && messages[0].role !== 'user') {
      this.logger.warn('First message is not from user, adding empty user message', {
        firstRole: messages[0].role
      });
      
      // Add an empty user message at the beginning
      messages.unshift({
        role: 'user',
        content: 'I need your help with the following conversation.'
      });
    }
    
    const requestBody: Record<string, unknown> = {
      messages,
      max_tokens: request.maxTokens || defaultSettings.maxTokens,
      temperature: request.temperature || defaultSettings.temperature,
      top_p: request.topP || defaultSettings.topP,
      anthropic_version: 'bedrock-2023-05-31'
    };

    // Add system prompt if provided
    if (systemPrompt) {
      requestBody.system = systemPrompt;
    }

    this.logger.debug('Formatting request for Claude model', {
      modelId,
      messageCount: messages.length,
      hasSystemPrompt: !!systemPrompt,
      requestBody
    });
    
    return requestBody;
  }

  validateRequest(request: GatewayRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('Messages are required for Claude models');
    }

    this.logger.debug('Validating request for Claude model', {
      messageCount: request.messages.length,
      systemPrompt: !!request.systemPrompt,
      messageRoles: request.messages.map(m => m.role)
    });

    // Get only non-system messages for alternation check
    const nonSystemMessages = request.messages.filter(msg => msg.role !== 'system');
    
    // Single message is always valid, no need to check alternation
    if (nonSystemMessages.length <= 1) {
      return;
    }
    
    // Check if roles alternate correctly between user and assistant
    let lastRole = nonSystemMessages[0].role;
    
    for (let i = 1; i < nonSystemMessages.length; i++) {
      const role = nonSystemMessages[i].role;
      
      // Check alternation
      if (role === lastRole) {
        // Two consecutive messages with the same role
        this.logger.warn('Messages not alternating correctly', {
          messageRoles: nonSystemMessages.map(m => m.role),
          position: i,
          role: role,
          lastRole: lastRole,
          fullMessages: request.messages
        });
        
        throw new Error(`Messages must alternate between 'user' and 'assistant' roles. Found consecutive '${role}' roles.`);
      }
      
      lastRole = role;
    }
  }

  getDefaultSettings() {
    return this.config.defaultSettings || {
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1
    };
  }

  getApiFormat(modelId: string): string {
    return 'messages';
  }

  formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> } {
    const responseObj = response as Record<string, unknown>;
    const content = responseObj.content as Array<{ text: string }> | undefined;
    
    this.logger.debug('Formatting Claude response', {
      response: responseObj,
      content
    });
    
    return {
      content: content?.[0]?.text || '',
      metadata: {
        model: responseObj.model,
        usage: responseObj.usage
      }
    };
  }
} 