import { handleLoadCommand } from '../loadCommand';
import { deleteUserLLMs } from '../../../system/repositories/llmRepository';
import { listModels, BedrockServiceError } from '../../../services/bedrock/bedrockClient';
import { LoadCommandRequest } from '../loadCommandTypes';
import { AwsApiResponse } from '../../../types/api/responseTypes';


// Mock the repositories
jest.mock('../../../services/dynamo/repositories/llmRepository');
jest.mock('../../../services/bedrock/bedrockClient');

describe('Load Command', () => {
  const testUser = {
    userId: 'test-user',
    userType: 'user' as const,
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle reset command', async () => {
    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['reset'],
      flags: {},
      raw: 'load llm reset',
      user: testUser
    };

    const result = await handleLoadCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('Reset complete');
    expect(deleteUserLLMs).toHaveBeenCalledWith(testUser.userId);
  });

  it('should handle loading from Bedrock source', async () => {
    const mockModels = [
      { modelId: 'anthropic.claude-3', providerName: 'Anthropic' },
      { modelId: 'meta.llama2', providerName: 'Meta' }
    ];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['source=bedrock'],
      flags: {},
      raw: 'load llm source=bedrock',
      user: testUser
    };

    const result = await handleLoadCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('Loaded 2 models from Bedrock');
    expect(body.data.models).toContain('anthropic.claude-3');
    expect(body.data.models).toContain('meta.llama2');
  });

  it('should handle Bedrock provider filter', async () => {
    const mockModels = [
      { modelId: 'anthropic.claude-3', providerName: 'Anthropic' }
    ];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['source=bedrock', 'provider=anthropic'],
      flags: {},
      raw: 'load llm source=bedrock provider=anthropic',
      user: testUser
    };

    const result = await handleLoadCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models).toHaveLength(1);
    expect(body.data.models[0]).toBe('anthropic.claude-3');
  });

  it('should handle specific model filter', async () => {
    const mockModels = [
      { modelId: 'anthropic.claude-3', providerName: 'Anthropic' },
      { modelId: 'anthropic.claude-2', providerName: 'Anthropic' }
    ];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['source=bedrock', 'model=anthropic.claude-3'],
      flags: {},
      raw: 'load llm source=bedrock model=anthropic.claude-3',
      user: testUser
    };

    const result = await handleLoadCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models).toHaveLength(1);
    expect(body.data.models[0]).toBe('anthropic.claude-3');
  });

  it('should handle Bedrock service errors', async () => {
    (listModels as jest.Mock).mockRejectedValue(
      new BedrockServiceError('Failed to connect to Bedrock', {})
    );

    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['source=bedrock'],
      flags: {},
      raw: 'load llm source=bedrock',
      user: testUser
    };

    const result = await handleLoadCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to connect to Bedrock');
  });

  it('should handle missing userId', async () => {
    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['reset'],
      flags: {},
      raw: 'load llm reset',
      user: { ...testUser, userId: undefined }
    };

    const result = await handleLoadCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Missing userId in user context');
  });

  it('should default to reset behavior when no source specified', async () => {
    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: [],
      flags: {},
      raw: 'load llm',
      user: testUser
    };

    const result = await handleLoadCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.message).toContain('No source specified');
    expect(deleteUserLLMs).toHaveBeenCalledWith(testUser.userId);
  });

  it('should handle inference type filter', async () => {
    const mockModels = [
      { 
        modelId: 'anthropic.claude-3',
        providerName: 'Anthropic',
        inferenceTypesSupported: ['ON_DEMAND']
      },
      {
        modelId: 'anthropic.claude-2',
        providerName: 'Anthropic',
        inferenceTypesSupported: ['PROVISIONED']
      }
    ];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['source=bedrock', 'support=ON_DEMAND'],
      flags: {},
      raw: 'load llm source=bedrock support=ON_DEMAND',
      user: testUser
    };

    const result = await handleLoadCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models).toHaveLength(1);
    expect(body.data.models[0]).toBe('anthropic.claude-3');
  });

  it('should handle inference type support filter', async () => {
    const mockModels = [
      { 
        modelId: 'anthropic.claude-3',
        providerName: 'Anthropic',
        inferenceTypesSupported: ['ON_DEMAND']
      }
    ];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: LoadCommandRequest = {
      action: 'load',
      object: 'llm',
      parameters: ['source=bedrock', 'support=ON_DEMAND'],
      flags: {},
      raw: 'load llm source=bedrock support=ON_DEMAND',
      user: testUser
    };

    const result = await handleLoadCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models).toHaveLength(1);
    expect(body.data.models[0]).toBe('anthropic.claude-3');
  });
});
