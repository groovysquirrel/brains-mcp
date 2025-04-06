import { AbstractVendor } from './AbstractVendor';
import { GatewayRequest } from '../types/Request';
import { VendorConfig } from '../types/Vendor';

export class AnthropicVendor extends AbstractVendor {
  constructor(config: VendorConfig) {
    super(config);
  }

  private getBedrockModelId(modelId: string): string {
    // Remove any existing prefix to normalize the ID
    const normalizedId = modelId.replace(/^anthropic\./, '');
    
    // Check if this is a Claude 3 model
    if (normalizedId.includes('claude-3')) {
      // For Claude 3 models, we need the full model ID with version
      const model = this.config.models?.find(m => 
        m.name === normalizedId || 
        m.id === normalizedId || 
        m.id === normalizedId
      );

      if (model) {
        return model.id;
      }

      // If no match found, construct the full model ID
      return normalizedId;
    }

    // For older models, just return the normalized ID
    return normalizedId;
  }

  getApiFormat(modelId: string): string {
    // Remove the vendor prefix if present
    const normalizedModelId = modelId.replace(/^anthropic\./, '');
    
    // Use the modelApiMapping from the vendor config
    const apiFormat = this.config.modelApiMapping?.[normalizedModelId];
    if (apiFormat) {
      return apiFormat;
    }
    
    // If no mapping found, check if the model is in the messages API list
    if (this.config.apiFormats?.messages?.models?.includes(normalizedModelId)) {
      return 'messages';
    }
    
    // Default to prompt API
    return 'prompt';
  }

  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown> {
    if (!request.messages) {
      throw new Error('Messages are required for Anthropic models');
    }

    const apiFormat = this.getApiFormat(modelId);
    const defaultSettings = this.getDefaultSettings();

    if (apiFormat === 'messages') {
      // Messages API format for Claude 3
      return {
        messages: request.messages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        max_tokens: request.maxTokens || defaultSettings.maxTokens,
        temperature: request.temperature || defaultSettings.temperature,
        top_p: request.topP || defaultSettings.topP,
        anthropic_version: 'bedrock-2023-05-31'
      };
    }

    // Prompt API format for Claude 2
    let prompt = '';
    
    // Add system message if present
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      prompt += `\n\nHuman: ${systemMessage.content}\n\n`;
    }

    // Add user messages
    const userMessages = request.messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      prompt += `\n\nHuman: ${userMessages[0].content}\n\n`;
    }

    // Add assistant messages if present
    const assistantMessages = request.messages.filter(msg => msg.role === 'assistant');
    if (assistantMessages.length > 0) {
      prompt += `Assistant: ${assistantMessages[0].content}\n\n`;
    }

    // Add final assistant prefix
    prompt += 'Assistant:';

    return {
      prompt,
      max_tokens_to_sample: request.maxTokens || defaultSettings.maxTokens,
      temperature: request.temperature || defaultSettings.temperature,
      top_p: request.topP || defaultSettings.topP,
      stop_sequences: request.stopSequences || defaultSettings.stopSequences
    };
  }

  validateRequest(request: GatewayRequest): void {
    if (!request.messages || request.messages.length === 0) {
      throw new Error('At least one message is required');
    }

    const validRoles = ['user', 'assistant', 'system'];
    for (const message of request.messages) {
      if (!validRoles.includes(message.role)) {
        throw new Error(`Invalid message role: ${message.role}`);
      }
    }
  }

  getDefaultSettings() {
    return this.config.defaultSettings || {
      maxTokens: 1024,
      temperature: 0.7,
      topP: 1,
      stopSequences: ['\n\nHuman:', '\n\nAssistant:']
    };
  }

  formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> } {
    const responseObj = response as Record<string, unknown>;
    const apiFormat = this.getApiFormat(responseObj.model as string);
    
    if (apiFormat === 'messages') {
      const content = Array.isArray(responseObj.content) 
        ? (responseObj.content[0] as { text: string })?.text || ''
        : responseObj.content as string;

      return {
        content,
        metadata: {
          model: responseObj.model,
          usage: responseObj.usage
        }
      };
    }

    return {
      content: responseObj.completion as string,
      metadata: {
        model: responseObj.model,
        usage: responseObj.usage
      }
    };
  }
} 