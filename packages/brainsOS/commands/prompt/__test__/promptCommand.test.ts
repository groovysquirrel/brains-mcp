import { handlePromptCommand } from '../promptCommand';
import { invokeModel } from '../../../core/services/bedrock/modelInvocation';
import { BedrockServiceError } from '../../../core/services/bedrock/bedrockClient';
import { PromptCommandRequest } from '../promptCommandTypes';
import { AwsApiResponse } from '../../../core/types/api/responseTypes';
import { conversationRepository } from '../../../core/repositories/conversation/conversationRepository';

jest.mock('../../../core/services/bedrock/modelInvocation');
jest.mock('../../../core/repositories/conversation/conversationRepository');

describe('Prompt Command', () => {
  const testUser = {
    userId: 'test-user',
    userType: 'user' as const,
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (conversationRepository.getHistory as jest.Mock).mockReturnValue([]);
  });

  it('should handle successful prompt', async () => {
    const mockResponse = {
      content: 'Test response',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    };

    (invokeModel as jest.Mock).mockResolvedValue(mockResponse);

    const command: PromptCommandRequest = {
      action: 'prompt',
      object: 'llm',
      parameters: ['Hello, how are you?'],
      flags: {},
      raw: 'prompt llm Hello, how are you?',
      user: testUser
    };

    const result = await handlePromptCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.response).toBe('Test response');
    expect(body.data.usage).toEqual(mockResponse.usage);
  });

  it('should handle missing prompt text', async () => {
    const command: PromptCommandRequest = {
      action: 'prompt',
      object: 'llm',
      parameters: [],
      flags: {},
      raw: 'prompt llm',
      user: testUser
    };

    const result = await handlePromptCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Missing model ID or prompt text');
  });

  it('should handle conversation history', async () => {
    const mockResponse = {
      content: 'Test response',
      usage: { promptTokens: 10, completionTokens: 20, totalTokens: 30 }
    };

    (invokeModel as jest.Mock).mockResolvedValue(mockResponse);
    (conversationRepository.getHistory as jest.Mock).mockReturnValue([
      { role: 'user', content: 'Previous message', timestamp: '2024-03-20T00:00:00Z' }
    ]);

    const command: PromptCommandRequest = {
      action: 'prompt',
      object: 'llm',
      parameters: ['Hello again'],
      flags: {},
      raw: 'prompt anthropic.claude-3 Hello again',
      user: testUser
    };

    await handlePromptCommand(command);

    expect(conversationRepository.updateHistory).toHaveBeenCalledWith(
      testUser.userId,
      'Hello again',
      'Test response'
    );
  });

  it('should handle base object prompt', async () => {
    const mockResponse = {
      content: 'Test response',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    };

    (invokeModel as jest.Mock).mockResolvedValue(mockResponse);

    const command: PromptCommandRequest = {
      action: 'prompt',
      object: 'llm',
      parameters: ['Hello, how are you?'],
      flags: {},
      raw: 'prompt llm Hello, how are you?',
      user: testUser
    };

    const result = await handlePromptCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.response).toBe('Test response');
    expect(body.data.usage).toEqual(mockResponse.usage);
  });

  it('should handle model ID prompt', async () => {
    const mockResponse = {
      content: 'Test response',
      usage: {
        promptTokens: 10,
        completionTokens: 20,
        totalTokens: 30
      }
    };

    (invokeModel as jest.Mock).mockResolvedValue(mockResponse);

    const command: PromptCommandRequest = {
      action: 'prompt',
      object: 'anthropic.claude-3-haiku-20240307-v1:0',
      parameters: ['Hello, how are you?'],
      flags: {},
      raw: 'prompt anthropic.claude-3-haiku-20240307-v1:0 Hello, how are you?',
      user: testUser
    };

    const result = await handlePromptCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.response).toBe('Test response');
    expect(body.data.usage).toEqual(mockResponse.usage);
  });
});