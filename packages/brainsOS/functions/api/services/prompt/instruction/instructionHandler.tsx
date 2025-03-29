import { APIGatewayProxyHandlerV2 } from 'aws-lambda';
import { Logger } from '../../../../../utils/logging/logger';
import { createResponse } from '../../../../../utils/http/response';
import { invokeModel } from '../../../../../core/services/bedrock/modelInvocation';
import { BedrockServiceError } from '../../../../../core/services/bedrock/bedrockClient';
import { PromptServiceError, ErrorCodes } from '../promptHandlerErrors';

const logger = new Logger('InstructionHandler');
const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant. Please provide accurate and relevant responses.";

export const instructionHandler: APIGatewayProxyHandlerV2 = async (event) => {
  const startTime = Date.now();
  
  try {
    const payload = JSON.parse(event.body!);
    const { userPrompt, systemPrompt = DEFAULT_SYSTEM_PROMPT, modelId, modelSource } = payload;

    try {
      // Invoke the model
      const result = await invokeModel({
        modelId,
        vendor: modelSource,
        source: 'instruction',
        prompt: userPrompt,
        systemPrompt,
        maxTokens: 1000
      });

      return createResponse(200, {
        success: true,
        data: {
          content: result.content,
          usage: result.usage
        },
        metadata: {
          processingTimeMs: Date.now() - startTime,
          promptType: 'instruction',
          modelId,
          modelSource,
          timestamp: new Date().toISOString()
        }
      });

    } catch (error) {
      if (error instanceof BedrockServiceError) {
        logger.error('Bedrock service error:', error);
        return createResponse(error.details.statusCode || 400, {
          success: false,
          error: {
            code: error.details.code || 'BEDROCK_ERROR',
            message: error.message,
            details: {
              code: error.details.code || 'BEDROCK_ERROR',
              service: error.details.service,
              statusCode: error.details.statusCode || 400,
              operation: error.details.operation,
              modelId: error.details.modelId,
              vendor: error.details.vendor
            }
          },
          metadata: {
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        });
      }
      throw error; // Re-throw non-Bedrock errors
    }

  } catch (error) {
    logger.error('Error in instruction handler:', error);
    throw new PromptServiceError(error.message, {
      code: ErrorCodes.INVOCATION_ERROR,
      service: 'instruction',
      statusCode: 500,
      details: error
    });
  }
};
