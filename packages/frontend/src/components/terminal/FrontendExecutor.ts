import { WebSocketService, WebSocketOptions } from '../../lib/websocket';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../../config';

export interface ExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  isLocalCommand?: boolean;
}

export class FrontendExecutor {
  private static websocket: WebSocketService | null = null;
  private static pendingCommands: Map<string, { 
    resolve: (value: ExecutionResult) => void, 
    reject: (reason: any) => void,
    timeoutId: NodeJS.Timeout
  }> = new Map();

  private static LOCAL_COMMANDS = {
    clear: (): ExecutionResult => ({ success: true, isLocalCommand: true, data: { clearScreen: true } }),
    cls: (): ExecutionResult => ({ success: true, isLocalCommand: true, data: { clearScreen: true } }),
    connect: (args: string[]): ExecutionResult => {
      const url = args[0] || this.getDefaultWebSocketUrl();
      this.setupWebSocket(url);
      return { 
        success: true, 
        isLocalCommand: true, 
        data: { 
          message: `Connecting to WebSocket at ${url}...` 
        } 
      };
    },
    disconnect: (): ExecutionResult => {
      if (this.websocket) {
        this.websocket.disconnect();
        this.websocket = null;
        return { 
          success: true, 
          isLocalCommand: true, 
          data: { 
            message: 'Disconnected from WebSocket server.' 
          } 
        };
      }
      return { 
        success: false, 
        isLocalCommand: true, 
        error: 'Not connected to any WebSocket server.' 
      };
    },
    help: (): ExecutionResult => ({
      success: true,
      isLocalCommand: true,
      data: {
        message: [
          'Available commands:',
          '  clear, cls               - Clear terminal',
          '  connect [url]            - Connect to WebSocket server',
          '  disconnect               - Disconnect from WebSocket server',
          '  status                   - Show connection status',
          '  help                     - Show this help message',
          '',
          'LLM commands:',
          '  llm/prompt <message>     - Send a one-off prompt',
          '  llm/conversation <msg>   - Start or continue a conversation',
          '',
          'Any other input will be sent to the remote server when connected.'
        ].join('\n')
      }
    }),
    status: (): ExecutionResult => {
      const isConnected = this.websocket?.isConnected() || false;
      return {
        success: true,
        isLocalCommand: true,
        data: {
          message: isConnected 
            ? 'Connected to WebSocket server.' 
            : 'Not connected to WebSocket server.'
        }
      };
    }
  };

  private static getDefaultWebSocketUrl(): string {
    // Use config or environment variable
    return config.api.websocket;
  }

  private static async getAuthToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  private static async setupWebSocket(url: string) {
    if (this.websocket) {
      this.websocket.disconnect();
    }
    
    try {
      // Get JWT token from Cognito
      const token = await this.getAuthToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token. Please log in again.');
      }
      
      const options: WebSocketOptions = {
        url,
        token
      };
      
      this.websocket = new WebSocketService(options);
      
      this.websocket.onMessage((message) => {
        console.log('WebSocket message received:', message);
        
        // Handle different message types from the server
        if (message.type === 'response' || message.type === 'error') {
          const pendingCommand = this.pendingCommands.get(message.data?.commandId);
          if (pendingCommand) {
            clearTimeout(pendingCommand.timeoutId);
            this.pendingCommands.delete(message.data.commandId);
            
            if (message.type === 'error') {
              pendingCommand.resolve({
                success: false,
                error: message.data.message || 'Unknown error occurred'
              });
            } else {
              pendingCommand.resolve({
                success: true,
                data: {
                  message: message.data.content || message.data.message || 'Command executed successfully.',
                  ...message.data
                }
              });
            }
          }
        }
      });
      
      this.websocket.onConnectionChange((isConnected) => {
        if (!isConnected) {
          // Reject all pending commands if connection is lost
          this.pendingCommands.forEach((pendingCommand, commandId) => {
            clearTimeout(pendingCommand.timeoutId);
            pendingCommand.reject(new Error('WebSocket connection lost'));
          });
          this.pendingCommands.clear();
        }
      });
      
      await this.websocket.connect();
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  static async execute(input: string, mode: 'command' | 'prompt'): Promise<ExecutionResult> {
    const trimmedInput = input.trim();
    
    if (!trimmedInput) {
      return { success: true, data: null };
    }

    // Split input into command and arguments
    const [command, ...args] = trimmedInput.split(/\s+/);
    
    // Check for local commands first
    const localCommandFn = this.LOCAL_COMMANDS[command as keyof typeof this.LOCAL_COMMANDS];
    if (localCommandFn) {
      return localCommandFn.call(this, args);
    }

    // If not a local command and we have a websocket connection, send command to server
    if (this.websocket?.isConnected()) {
      const commandId = Date.now().toString();
      
      // Format the message according to the backend expectations
      let action = 'console/command';  // Default action type
      let data: any = {};

      // Handle special commands for LLM interaction
      if (trimmedInput.startsWith('llm/prompt')) {
        action = 'llm/prompt';
        const message = trimmedInput.substring('llm/prompt'.length).trim();
        data = {
          messages: [{ role: 'user', content: message }],
          provider: 'bedrock',
          modality: 'text'
        };
      } else if (trimmedInput.startsWith('llm/conversation')) {
        action = 'llm/conversation';
        const message = trimmedInput.substring('llm/conversation'.length).trim();
        data = {
          messages: [{ role: 'user', content: message }],
          provider: 'bedrock',
          modality: 'text',
          title: 'Console Conversation',
          tags: ['console', 'brainsos']
        };
      } else {
        // Default to sending the command as is
        data = {
          commandId,
          command: trimmedInput,
          mode
        };
      }
      
      return new Promise<ExecutionResult>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          this.pendingCommands.delete(commandId);
          reject(new Error('Command execution timed out'));
        }, 10000); // 10 second timeout
        
        this.pendingCommands.set(commandId, { resolve, reject, timeoutId });
        
        const success = this.websocket!.sendMessage(action, data);
        
        if (!success) {
          clearTimeout(timeoutId);
          this.pendingCommands.delete(commandId);
          reject(new Error('Failed to send command to server'));
        }
      })
      .catch(error => ({
        success: false,
        error: `Error executing command: ${error.message}`
      }));
    }

    // Not connected to websocket
    return {
      success: false,
      error: 'Not connected to WebSocket server. Use "connect" to establish a connection.'
    };
  }
} 