import { APIGatewayProxyHandlerV2WithIAMAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Logger } from '../../../../../utils/logging/logger';
import { createResponse } from '../../../../../utils/http/response';
import { invokeModel, InvocationParams, InvocationResponse } from '../../../../../system/services/bedrock/modelInvocation';
import { PromptServiceError, ErrorCodes } from '../promptHandlerErrors';
import { 
  conversationRepository, 
  IConversationRepository 
} from '../../../../../system/repositories/conversation/conversationRepository';
import { Message, MessageRole, MessageContent } from '../../../../../system/repositories/conversation/conversationTypes';

// Initialize logger for this module
const logger = new Logger('ConversationHandler');

/**
 * Expected structure of incoming conversation requests
 * Example:
 * {
 *   "userPrompt": "Tell me a joke",
 *   "modelId": "anthropic.claude-v2",
 *   "modelSource": "bedrock",
 *   "conversationId": "conv123"
 * }
 */
interface ConversationRequest {
  userPrompt: string;      // The user's input message
  modelId: string;         // The AI model to use (e.g., "anthropic.claude-v2")
  modelSource: string;     // The model provider (e.g., "bedrock")
  conversationId: string;  // Unique identifier for this conversation
  systemPrompt?: string;  // Optional system prompt
}

// Initialize repository for user conversations with proper typing
const userConversationRepository: IConversationRepository = conversationRepository.getInstance('user');

/**
 * Lambda handler for conversation endpoints
 * Handles both new conversations and continuations of existing ones
 * 
 * Flow:
 * 1. Validate request
 * 2. Get conversation history
 * 3. Format prompt with context
 * 4. Invoke AI model
 * 5. Save response
 * 6. Return formatted response
 */
export const conversationHandler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event): Promise<APIGatewayProxyResultV2> => {
  // Start timing the request
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const userId = event.requestContext.authorizer?.iam?.userId;

  try {
    // Validate request body exists
    if (!event.body) {
      throw new PromptServiceError('Missing request body', {
        code: ErrorCodes.MISSING_PAYLOAD,
        service: 'conversationHandler',
        statusCode: 400
      });
    }

    // Parse and log the request
    const request: ConversationRequest = JSON.parse(event.body);
    logger.info(`[${requestId}] Processing conversation request:`, { request });

    // Extract systemPrompt from request
    const { userPrompt, modelId, modelSource, conversationId, systemPrompt } = request;

    // Validate all required fields are present
    if (!userPrompt || !modelId || !modelSource || !conversationId) {
      throw new PromptServiceError('Missing required fields', {
        code: ErrorCodes.MISSING_PAYLOAD,
        service: 'conversationHandler',
        statusCode: 400
      });
    }

    // Parse the vendor from the model ID
    const vendor = modelId.split('.')[0];
    const isClaudeThree = modelId.includes('claude-3');

    // Retrieve previous messages in this conversation
    const history = await userConversationRepository.getConversationHistory(
      userId,
      conversationId
    );

    // Call the AI model with the message history
    const modelResponse = await invokeModel({
      prompt: userPrompt,
      modelId,
      vendor,
      source: modelSource,
      systemPrompt,
      temperature: 0.7,
      maxTokens: 4000,
      messageHistory: history.map(msg => ({
        role: msg.role,
        content: typeof msg.content === 'string' ? msg.content : msg.content.map(c => c.text).join(' ')
      }))
    });

    // Extract the response text
    const responseText = (modelResponse as InvocationResponse).content;

    // Save both the user's message and the AI's response
    await userConversationRepository.addToConversation(
      userId,
      conversationId,
      [
        { role: 'user', content: userPrompt },
        { role: 'assistant', content: responseText }
      ]
    );

    // Log completion time
    const endTime = Date.now();
    logger.info(`[${requestId}] Request completed in ${endTime - startTime}ms`);

    // Return successful response with metadata
    return createResponse(200, {
      success: true,
      data: {
        response: responseText,
        conversationId: conversationId
      },
      metadata: {
        requestId,
        processingTimeMs: Date.now() - startTime,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    // Log the error with more context
    logger.error('Error in conversation handler:', {
      error,
      requestId,
      userId,
      ...(error.details && { details: error.details })
    });

    // If it's a throttling error, add retry information
    if (error.code === 'ThrottlingException' || error.message?.includes('Too many requests')) {
      const retryAfter = 15 + Math.floor(Math.random() * 5); // 15-20 seconds
      return createResponse(429, {
        success: false,
        error: {
          code: ErrorCodes.INVOCATION_ERROR,
          message: 'Rate limit exceeded. Please try again later.',
          
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // If it's already a PromptServiceError, rethrow it
    if (error instanceof PromptServiceError) {
      throw error;
    }

    // Otherwise, wrap it in a PromptServiceError
    throw new PromptServiceError(error.message || 'Internal server error', {
      code: ErrorCodes.INVOCATION_ERROR,
      service: 'conversation',
      statusCode: 500,
      details: error
    });
  }
};

// New helper function to format the conversation prompt
function formatConversationPrompt(
  systemPrompt: string | undefined,
  history: Message[],
  currentPrompt: string
): string {
  const parts: string[] = [];

  // Add system prompt if present
  if (systemPrompt) {
    parts.push(`System: ${systemPrompt}\n`);
  }

  // Add conversation history
  if (history.length > 0) {
    const historyText = history
      .map(msg => `${msg.role}: ${msg.content}`)
      .join('\n');
    parts.push(historyText);
  }

  // Add current prompt
  parts.push(`user: ${currentPrompt}\nassistant:`);

  return parts.join('\n');
}
