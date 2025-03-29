import { getCurrentUser } from 'aws-amplify/auth';
import { post } from '@aws-amplify/api';

export class CommandExecutor {
  private static LOCAL_COMMANDS = {
    clear: () => true,
    cls: () => true,
    help: () => ({
      success: true,
      data: {
        message: [
          'Available local commands:',
          '  clear, cls - Clear terminal',
          '  help      - Show this help message'
        ].join('\n')
      }
    })
  };

  static async execute(command: string): Promise<any> {

    

    const trimmedCommand = command.trim();
    
    if (!trimmedCommand) {
      return null;
    }

    const localResult = this.handleLocalCommand(trimmedCommand);
    if (localResult) {
      return localResult;
    }

    return await this.handleRemoteCommand(trimmedCommand);
  }

  private static handleLocalCommand(command: string): any {
    const localCommand = this.LOCAL_COMMANDS[command as keyof typeof this.LOCAL_COMMANDS];
    if (localCommand) {
      return localCommand();
    }
    return null;
  }

  private static async handleRemoteCommand(command: string) {
    try {
      const user = await getCurrentUser();
      console.log('[CommandExecutor] User auth status:', !!user);
      
      if (!user) {
        return { success: false, error: 'User not authenticated' };
      }

      console.log('[CommandExecutor] Sending command:', command);
      const response = await this.sendCommand(command);
      console.log('[CommandExecutor] Response received:', response);
      return response;
    } catch (error) {
      console.error('[CommandExecutor] Error in handleRemoteCommand:', error);
      return { success: false, error: 'Failed to execute command: ' + (error as Error).message };
    }
  }

  private static async sendCommand(command: string) {
    try {
      
      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/commands",
        options: {
          body: {
            command: command
          }
        }
      });

      const { body } = await restOperation.response;
      const responseData = await body.json();
      return responseData;


    } catch (error) {
      console.error('❌ Command execution failed:', {
        error,
        errorType: error instanceof Error ? error.name : typeof error,
        message: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }
}