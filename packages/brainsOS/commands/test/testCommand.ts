import { TestCommandRequest } from './testCommandTypes';
import { createResponse } from '../../utils/http/response';
import { testConnection, BedrockServiceError } from '../../core/services/bedrock/bedrockClient';

export async function handleTestCommand(command: TestCommandRequest) {
  try {
    // Extract just the credential ID for cleaner logging
    const userId = command.user.userId.split(':')[0] || command.user.userId;
    
    console.log('Testing connection with user:', {
      userId,
      userType: command.user.userType,
      parameters: command.parameters,
      timestamp: new Date().toISOString()
    });
    
    if (!command.user.userId) {
      console.error('Missing userId in command:', command);
      throw new Error('Missing userId in user context');
    }

    // Check for service parameter
    const serviceParam = command.parameters.find(p => p.startsWith('service='));
    const service = serviceParam?.split('=')[1];

    if (service === 'bedrock') {
      try {
        console.log('Testing Bedrock connection...');
        await testConnection();
        return createResponse(200, {
          success: true,
          data: {
            message: "Bedrock connection successful",
            service: "bedrock",
            userId,
            timestamp: new Date().toISOString()
          }
        });
      } catch (error) {
        console.error('Bedrock connection failed:', error);
        if (error instanceof BedrockServiceError) {
          return createResponse(500, {
            success: false,
            error: error.details?.message || error.message || 'Bedrock connection failed'
          });
        }
        throw error;
      }
    }

    console.log('Testing default backend connection...');
    return createResponse(200, {
      success: true,
      data: {
        message: "Backend connection successful",
        userId,
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Test command failed:', error);
    return createResponse(500, {
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error occurred during test'
    });
  }
}