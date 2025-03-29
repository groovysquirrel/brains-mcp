import { CommandExecutor } from '../api/CommandExecutor';
import { PromptExecutor } from '../api/PromptExecutor';

export interface ExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  isLocalCommand?: boolean;
}

export class FrontendExecutor {
  private static LOCAL_COMMANDS = {
    clear: (): ExecutionResult => ({ success: true, isLocalCommand: true, data: { clearScreen: true } }),
    cls: (): ExecutionResult => ({ success: true, isLocalCommand: true, data: { clearScreen: true } }),
    help: (): ExecutionResult => ({
      success: true,
      isLocalCommand: true,
      data: {
        message: [
          'Available commands:',
          '  clear, cls - Clear terminal',
          '  help      - Show this help message',
          '',
          'Any other input will be sent to the remote API.'
        ].join('\n')
      }
    })
  };

  static async execute(input: string, mode: 'command' | 'prompt', request: string): Promise<ExecutionResult> {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      return { success: true, data: null };
    }

    // Check for local commands first
    const localCommand = this.LOCAL_COMMANDS[trimmedInput as keyof typeof this.LOCAL_COMMANDS];
    if (localCommand) {
      return localCommand();
    }

    // If not a local command, forward to appropriate executor
    try {
      const result = mode === 'command' 
        ? await CommandExecutor.execute(trimmedInput)
        : await PromptExecutor.execute(trimmedInput, request);
      
      return { success: true, message: result.data?.message, data: result.data };
    } catch (error) {
      return {
        success: false,
        error: `Failed to execute ${mode}: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}
