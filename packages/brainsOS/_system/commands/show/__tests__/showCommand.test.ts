import { handleShowCommand } from '../showCommand';
import { ShowCommandRequest } from '../showCommandTypes';
import { listModels, BedrockServiceError } from '../../../services/bedrock/bedrockClient';

describe('Show Command', () => {
  const testUser = {
    userId: 'test-user',
    userType: 'user' as const,
    email: 'test@example.com'
  };

  it('should show system info with JSON flag', async () => {
    const command: ShowCommandRequest = {
      action: 'show',
      object: 'system',
      parameters: [],
      flags: { json: true },
      raw: 'show system --json',
      user: testUser
    };

    const result = await handleShowCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('status');
  });

  it('should show model info with version flag', async () => {
    const command: ShowCommandRequest = {
      action: 'show',
      object: 'model',
      parameters: ['gpt-4'],
      flags: { version: 'latest' },
      raw: 'show model gpt-4 --version=latest',
      user: testUser
    };

    const result = await handleShowCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('name', 'gpt-4');
  });

  it('should show llm info same as model info', async () => {
    const command: ShowCommandRequest = {
      action: 'show',
      object: 'llm',
      parameters: ['gpt-4'],
      flags: { version: 'latest' },
      raw: 'show llm gpt-4 --version=latest',
      user: testUser
    };

    const result = await handleShowCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data).toHaveProperty('name', 'gpt-4');
  });

  it('should show detailed model information with detail flag', async () => {
    const command: ShowCommandRequest = {
      action: 'show',
      object: 'llm',
      parameters: [],
      flags: { detail: true },
      raw: 'show llm --detail',
      user: testUser
    };

    const result = await handleShowCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models[0]).toHaveProperty('capabilities');
    expect(body.data.models[0]).toHaveProperty('actualProvider');
    expect(body.data.models[0]).toHaveProperty('createdAt');
  });

  it('should show bedrock models when source=bedrock', async () => {
    const mockModels = [
      { modelId: 'anthropic.claude-3', modelName: 'Claude 3', providerName: 'Anthropic' }
    ];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: ShowCommandRequest = {
      action: 'show',
      object: 'llm',
      parameters: ['source=bedrock'],
      flags: {},
      raw: 'show llm source=bedrock',
      user: testUser
    };

    const result = await handleShowCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models[0].id).toBe('anthropic.claude-3');
    expect(body.data.models[0].provider).toBe('bedrock');
  });

  it('should show detailed bedrock models when source=bedrock with detail flag', async () => {
    const mockModels = [{
      modelId: 'anthropic.claude-3',
      modelName: 'Claude 3',
      providerName: 'Anthropic',
      customizationsSupported: true,
      inputModalities: ['text'],
      outputModalities: ['text'],
      inferenceTypesSupported: ['text-generation']
    }];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: ShowCommandRequest = {
      action: 'show',
      object: 'llm',
      parameters: ['source=bedrock'],
      flags: { detail: true },
      raw: 'show llm source=bedrock --detail',
      user: testUser
    };

    const result = await handleShowCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models[0]).toHaveProperty('inputModalities');
    expect(body.data.models[0]).toHaveProperty('outputModalities');
    expect(body.data.models[0]).toHaveProperty('inferenceTypesSupported');
  });

  it('should filter bedrock models by inference type', async () => {
    const mockModels = [
      {
        modelId: 'anthropic.claude-3',
        modelName: 'Claude 3',
        providerName: 'Anthropic',
        inferenceTypesSupported: ['ON_DEMAND']
      },
      {
        modelId: 'anthropic.claude-2',
        modelName: 'Claude 2',
        providerName: 'Anthropic',
        inferenceTypesSupported: ['PROVISIONED']
      }
    ];
    
    (listModels as jest.Mock).mockResolvedValue(mockModels);

    const command: ShowCommandRequest = {
      action: 'show',
      object: 'llm',
      parameters: ['source=bedrock', 'support=ON_DEMAND'],
      flags: {},
      raw: 'show llm source=bedrock support=ON_DEMAND',
      user: testUser
    };

    const result = await handleShowCommand(command);
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.models).toHaveLength(1);
    expect(body.data.models[0].id).toBe('anthropic.claude-3');
    expect(body.data.models[0].inferenceTypesSupported).toContain('ON_DEMAND');
  });
});
