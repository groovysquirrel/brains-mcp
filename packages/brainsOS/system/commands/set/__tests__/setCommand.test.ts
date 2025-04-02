import { handleSetCommand } from '../setCommand';
import { handleShowCommand } from '../../show/showCommand';
import { 
  updateSystemSettings, 
  getSystemSettings 
} from '../../../system/repositories/systemRepository';
import { AwsApiResponse } from '../../../types/api/responseTypes';
import { SetCommandRequest } from '../setCommandTypes';
import { ShowCommandRequest } from '../../show/showCommandTypes';
import { UserContext } from '../../../types/userTypes';

// Mock the repository
jest.mock('../../../services/dynamo/repositories/systemRepository');

describe('System Settings Commands', () => {
  const testUser: UserContext = {
    userId: 'test-user',
    userType: 'user',
    email: 'test@example.com'
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should initialize system with defaults when no settings exist', async () => {
    // Mock empty settings then successful update
    (getSystemSettings as jest.Mock).mockResolvedValueOnce({});
    (updateSystemSettings as jest.Mock).mockResolvedValue({});

    const setCommand: SetCommandRequest = {
      action: 'set',
      object: 'system',
      parameters: ['llm=test'] as [string],
      flags: {},
      raw: 'set system llm=test',
      user: testUser
    };

    const result = await handleSetCommand(setCommand) as AwsApiResponse;
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).data.message).toContain('System initialized with default settings');
    expect(updateSystemSettings).toHaveBeenCalledWith(testUser, { llm: 'test' });
  });

  it('should update existing settings without loading defaults', async () => {
    // Mock existing settings
    (getSystemSettings as jest.Mock).mockResolvedValueOnce({ 
      llm: 'claude-3',
      temperature: 0.7 
    });
    (updateSystemSettings as jest.Mock).mockResolvedValue({});

    const setCommand: SetCommandRequest = {
      action: 'set',
      object: 'system',
      parameters: ['llm=test'] as [string],
      flags: {},
      raw: 'set system llm=test',
      user: testUser
    };

    const result = await handleSetCommand(setCommand) as AwsApiResponse;
    
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).data.message).toBe('System setting llm updated successfully');
    expect(updateSystemSettings).toHaveBeenCalledWith(testUser, { llm: 'test' });
  });

  it('should retrieve system settings', async () => {
    (getSystemSettings as jest.Mock).mockResolvedValue({ 
      llm: 'test',
      temperature: 0.7 
    });

    const showCommand: ShowCommandRequest = {
      action: 'show',
      object: 'system',
      parameters: [],
      flags: {},
      raw: 'show system',
      user: testUser
    };

    const result = await handleShowCommand(showCommand) as AwsApiResponse;
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).data).toEqual({ 
      llm: 'test',
      temperature: 0.7 
    });
  });
});