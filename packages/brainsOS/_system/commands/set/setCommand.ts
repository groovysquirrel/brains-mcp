import { SetCommandRequest } from './setCommandTypes';
import { createResponse } from '../../../utils/http/response';
import { systemRepository } from '../../repositories/system/systemRepository';
import { defaults } from "../../../data/dataIndex";

export async function handleSetCommand(command: SetCommandRequest) {
  try {
    console.log('Handling set command with user:', command.user);
    
    if (!command.user.userId) {
      throw new Error('Missing userId in user context');
    }

    switch (command.object) {
      case 'system': {
        const [key, value] = command.parameters[0].split('=');
        
        if (key === 'config' && value === 'default') {
          await systemRepository.resetSettings(command.user);
          return createResponse(200, {
            success: true,
            data: { message: 'System settings reset to defaults' }
          });
        }

        // Check if settings exist before update
        const currentSettings = await systemRepository.getSettings(command.user);
        const isFirstTimeInit = Object.keys(currentSettings).length === 0;
        
        try {
          if (isFirstTimeInit) {
            // Load default settings first
            await systemRepository.updateSettings(command.user, defaults.system);
            // Then apply the new setting
            await systemRepository.updateSettings(command.user, { [key]: value });
          } else {
            await systemRepository.updateSettings(command.user, { [key]: value });
          }
        } catch (error) {
          console.error('Error in updateSystemSettings:', error);
          throw error;
        }

        return createResponse(200, {
          success: true,
          data: { 
            message: isFirstTimeInit 
              ? `System initialized with default settings and ${key} set to ${value}`
              : `System setting ${key} updated successfully`
          }
        });
      }
      
      case 'model':
        return await handleSetModel(command);
      
      default:
        return createResponse(400, {
          success: false,
          error: `Unsupported set object: ${command.object}`
        });
    }
  } catch (error) {
    console.error('Command failed:', error);
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

async function handleSetModel(command: SetCommandRequest) {
  const modelName = command.parameters[0];
  // TODO: Implement model setting logic with DynamoDB
  return createResponse(200, {
    success: true,
    data: {
      message: `Model set to: ${modelName}`
    }
  });
}