import { handleTestCommand } from '../testCommand';
import { TestCommandRequest } from '../testCommandTypes';
import { AwsApiResponse } from '../../../types/api/responseTypes';
import { testConnection } from '../../../services/bedrock/bedrockClient';

// Mock the bedrock client
jest.mock('../../../services/bedrock/bedrockClient');

describe('Test Command', () => {
  const testUser = {
    userId: 'test-user',
    userType: 'user' as const,
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should handle basic connection test', async () => {
    const command: TestCommandRequest = {
      action: 'test',
      object: 'connection',
      parameters: [],
      flags: {},
      raw: 'test connection',
      user: testUser
    };

    const result = await handleTestCommand(command) as AwsApiResponse;
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
  });

  it('should handle bedrock connection test successfully', async () => {
    (testConnection as jest.Mock).mockResolvedValue(true);

    const command: TestCommandRequest = {
      action: 'test',
      object: 'connection',
      parameters: ['service=bedrock'],
      flags: {},
      raw: 'test connection service=bedrock',
      user: testUser
    };

    const result = await handleTestCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.service).toBe('bedrock');
    expect(testConnection).toHaveBeenCalled();
  });

  it('should handle bedrock connection failure', async () => {
    (testConnection as jest.Mock).mockRejectedValue(
      new Error('Failed to connect to Bedrock')
    );

    const command: TestCommandRequest = {
      action: 'test',
      object: 'connection',
      parameters: ['service=bedrock'],
      flags: {},
      raw: 'test connection service=bedrock',
      user: testUser
    };

    const result = await handleTestCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    
    expect(result.statusCode).toBe(500);
    expect(body.success).toBe(false);
    expect(body.error).toBe('Failed to connect to Bedrock');
  });
});
