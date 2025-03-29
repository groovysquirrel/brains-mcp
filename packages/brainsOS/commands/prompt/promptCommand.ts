import { PromptCommandRequest, PromptCommandParams } from './promptCommandTypes';
import { createResponse } from '../../utils/http/response';
import { BedrockServiceError } from '../../core/services/bedrock/bedrockClient';
import { invokeModel } from '../../core/services/bedrock/modelInvocation';
import { conversationRepository } from '../../core/repositories/conversation/conversationRepository';

function parsePromptParameters(command: PromptCommandRequest): PromptCommandParams {
  const modelId = command.object;
  const message = command.flags.message || command.parameters.join(' ');
  const history = conversationRepository.getHistory(command.user.userId);
  
  return {
    modelId,
    message,
    messageHistory: history,
    temperature: command.flags.temperature ? parseFloat(command.flags.temperature) : undefined,
    maxTokens: command.flags.maxTokens ? parseInt(command.flags.maxTokens) : undefined
  };
}

export async function handlePromptCommand(command: PromptCommandRequest) {
  try {
    console.log('Handling prompt command:', {
      action: command.action,
      object: command.object,
      parameters: command.parameters,
      flags: command.flags,
      userId: command.user.userId
    });

    if (!command.user.userId) {
      console.error('Missing userId in user context');
      throw new Error('Missing userId in user context');
    }

    if (!command.object || (!command.flags.message && !command.parameters.length)) {
      console.error('Missing required parameters:', {
        object: command.object,
        flags: command.flags,
        parameters: command.parameters
      });
      return createResponse(400, {
        success: false,
        error: 'Missing model ID or message'
      });
    }

    try {
      const params = parsePromptParameters(command);
      console.log('Invoking model with params:', {
        modelId: params.modelId,
        messageLength: params.message.length,
        temperature: params.temperature,
        maxTokens: params.maxTokens
      });

      const response = await invokeModel({
        modelId: params.modelId,
        vendor: '[fix this later...]',
        source: '[fix this later...]',
        prompt: params.message,
        temperature: params.temperature,
        maxTokens: params.maxTokens
      });

      conversationRepository.updateHistory(command.user.userId, params.message, response.content);

      return createResponse(200, {
        success: true,
        data: {
          modelId: params.modelId,
          response: response.content,
          usage: response.usage,
          timestamp: new Date().toISOString()
        }
      });
    } catch (error) {
      console.error('Bedrock service error:', error);
      if (error instanceof BedrockServiceError) {
        const errorMessage = error.message || 'Failed to invoke Bedrock model';
        return createResponse(503, {
          success: false,
          error: errorMessage,
          metadata: { 
            modelId: command.object,
            details: error.details
          }
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('Unhandled error in prompt command:', error);
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}