import { APIGatewayProxyEventV2, Context, Callback, APIGatewayProxyStructuredResultV2 } from 'aws-lambda';
import { conversationHandler } from '../conversationHandler';
import { createMockEvent } from '../../../../../../utils/test/mockEvent';
import { conversationRepository, IConversationRepository } from '../../../../../../system/repositories/conversation/conversationRepository';
import { invokeModel } from '../../../../../../system/services/bedrock/modelInvocation';
import { PromptServiceError } from '../../promptHandlerErrors';
import { Message, MessageRole } from '../../../../../../system/repositories/conversation/conversationTypes';

// Mock dependencies
jest.mock('../../../../../../core/repositories/conversation/conversationRepository');
jest.mock('../../../../../../core/services/bedrock/modelInvocation');

interface ConversationResponse {
  success: boolean;
  data: {
    response: string;
    conversationId: string;
  };
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
}

describe('conversationHandler', () => {
  const mockUserId = 'test-user-id';
  const mockConversationId = 'test-conversation-id';
  const mockModelResponse = { content: 'AI response' };
  
  // Create a mock repository instance with properly typed jest mock functions
  const mockRepository: jest.Mocked<IConversationRepository> = {
    getConversationHistory: jest.fn().mockResolvedValue([]),
    addToConversation: jest.fn().mockResolvedValue(undefined)
  };

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset all mocks
    jest.mocked(conversationRepository.getInstance).mockReturnValue(mockRepository);
    jest.mocked(invokeModel).mockResolvedValue(mockModelResponse);
  });

  // Mock context and callback
  const mockContext: Context = {
    callbackWaitsForEmptyEventLoop: true,
    functionName: 'test',
    functionVersion: '1',
    invokedFunctionArn: 'arn:test',
    memoryLimitInMB: '128',
    awsRequestId: 'test-request-id',
    logGroupName: 'test-group',
    logStreamName: 'test-stream',
    getRemainingTimeInMillis: () => 1000,
    done: () => {},
    fail: () => {},
    succeed: () => {},
  };

  const mockCallback: Callback = () => {};

  // Helper to create a basic authorized event with conversation payload
  const createConversationEvent = (overrides = {}) => createMockEvent({
    body: JSON.stringify({
      userPrompt: 'Hello AI',
      modelId: 'anthropic.claude-v2',
      modelSource: 'bedrock',
      conversationId: mockConversationId,
      ...overrides
    }),
    requestContext: {
      ...createMockEvent().requestContext,
      authorizer: {
        iam: {
          userId: mockUserId
        }
      }
    }
  });

  describe('Success cases', () => {
    it('should handle a new conversation successfully', async () => {
      const event = createConversationEvent();
      const response = await conversationHandler(event, mockContext, mockCallback) as APIGatewayProxyStructuredResultV2;

      expect(response).toEqual(expect.objectContaining({
        statusCode: 200,
        headers: expect.any(Object),
        body: expect.any(String)
      }));

      const body = JSON.parse(response.body) as ConversationResponse;
      expect(body).toMatchObject({
        success: true,
        data: {
          response: mockModelResponse.content,
          conversationId: mockConversationId
        }
      });

      // Verify interactions with mock repository
      expect(mockRepository.getConversationHistory).toHaveBeenCalledWith(
        mockUserId,
        mockConversationId
      );
      expect(invokeModel).toHaveBeenCalled();
      expect(mockRepository.addToConversation).toHaveBeenCalledWith(
        mockUserId,
        mockConversationId,
        'Hello AI',
        mockModelResponse.content
      );
    });

    it('should include conversation history in the prompt', async () => {
      const mockHistory: Message[] = [
        { role: 'user' as MessageRole, content: 'Previous message', timestamp: '2024-01-01T00:00:00.000Z' },
        { role: 'assistant' as MessageRole, content: 'Previous response', timestamp: '2024-01-01T00:00:00.000Z' }
      ];
      mockRepository.getConversationHistory.mockResolvedValueOnce(mockHistory);

      const event = createConversationEvent();
      await conversationHandler(event, mockContext, mockCallback);

      // Verify the prompt includes history
      expect(invokeModel).toHaveBeenCalledWith(expect.objectContaining({
        prompt: expect.stringContaining('Previous message'),
        vendor: 'anthropic',
        modelId: 'anthropic.claude-v2'
      }));
    });
  });

  describe('Error cases', () => {
    it('should handle missing request body', async () => {
      const event = createMockEvent({
        body: null,
        requestContext: {
          ...createMockEvent().requestContext,
          authorizer: { iam: { userId: mockUserId } }
        }
      });

      await expect(conversationHandler(event, mockContext, mockCallback)).rejects.toThrow(PromptServiceError);
    });

    it('should handle missing required fields', async () => {
      const event = createConversationEvent({
        userPrompt: undefined
      });

      await expect(conversationHandler(event, mockContext, mockCallback)).rejects.toThrow(PromptServiceError);
    });

    it('should handle model invocation errors', async () => {
      (invokeModel as jest.Mock).mockRejectedValue(new Error('Model error'));
      const event = createConversationEvent();

      await expect(conversationHandler(event, mockContext, mockCallback)).rejects.toThrow(PromptServiceError);
    });

    it('should handle repository errors', async () => {
      // Setup the mock to throw an error
      mockRepository.getConversationHistory.mockRejectedValueOnce(
        new Error('Database error')
      );
      const event = createConversationEvent();

      await expect(conversationHandler(event, mockContext, mockCallback))
        .rejects.toThrow(PromptServiceError);
    });
  });

  describe('Input validation', () => {
    it('should validate modelId format', async () => {
      const event = createConversationEvent({
        modelId: 'invalid-model'
      });

      await expect(conversationHandler(event, mockContext, mockCallback)).rejects.toThrow(PromptServiceError);
    });

    it('should validate conversation ID', async () => {
      const event = createConversationEvent({
        conversationId: ''
      });

      await expect(conversationHandler(event, mockContext, mockCallback)).rejects.toThrow(PromptServiceError);
    });
  });
}); 