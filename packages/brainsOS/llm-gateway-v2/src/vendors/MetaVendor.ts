import { AbstractVendor } from './AbstractVendor';
import { GatewayRequest } from '../types/Request';
import { VendorConfig } from '../types/Vendor';

export class MetaVendor extends AbstractVendor {
  constructor(config: VendorConfig) {
    super(config);
  }

  formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown> {
    if (!request.messages) {
      throw new Error('Messages are required for Meta models');
    }

    const defaultSettings = this.getDefaultSettings();
    
    // Format messages according to Bedrock's requirements
    let prompt = '';
    
    // Add system message if present
    const systemMessage = request.messages.find(msg => msg.role === 'system');
    if (systemMessage) {
      prompt += `System: ${systemMessage.content}\n\n`;
    }

    // Add user messages
    const userMessages = request.messages.filter(msg => msg.role === 'user');
    if (userMessages.length > 0) {
      prompt += `Human: ${userMessages[0].content}\n\n`;
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
      max_gen_len: request.maxTokens || defaultSettings.maxTokens,
      temperature: request.temperature || defaultSettings.temperature,
      top_p: request.topP || defaultSettings.topP
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
      maxTokens: 4096,
      temperature: 0.7,
      topP: 1
    };
  }

  getApiFormat(modelId: string): string {
    // Meta models use a single format
    return 'prompt';
  }

  formatResponse(response: unknown): { content: string; metadata?: Record<string, unknown> } {
    const responseObj = response as Record<string, unknown>;
    
    return {
      content: responseObj.generation as string,
      metadata: {
        model: responseObj.model,
        usage: responseObj.usage
      }
    };
  }
} 