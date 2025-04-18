import { WebSocketService, WebSocketOptions } from '../../lib/websocket';
import { fetchAuthSession } from 'aws-amplify/auth';
import config from '../../config';

/**
 * Represents the result of a command execution
 */
export interface ExecutionResult {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
  isLocalCommand?: boolean;
}

/**
 * FrontendExecutor handles command execution and WebSocket communication
 * It manages local commands and remote command execution through WebSocket
 */
export class FrontendExecutor {
  private static websocket: WebSocketService | null = null;
  private static pendingCommands: Map<string, { 
    resolve: (value: ExecutionResult) => void, 
    reject: (reason: any) => void,
    timeoutId: NodeJS.Timeout
  }> = new Map();
  private static isConnecting: boolean = false;
  private static connectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private static statusObservers: ((status: 'disconnected' | 'connecting' | 'connected') => void)[] = [];

  /**
   * Subscribe to connection status changes
   */
  public static onConnectionStatusChange(callback: (status: 'disconnected' | 'connecting' | 'connected') => void): () => void {
    this.statusObservers.push(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
    // Return unsubscribe function
    return () => {
      this.statusObservers = this.statusObservers.filter(cb => cb !== callback);
    };
  }

  /**
   * Update connection status and notify observers
   */
  private static setConnectionStatus(status: 'disconnected' | 'connecting' | 'connected'): void {
    if (this.connectionStatus !== status) {
      this.connectionStatus = status;
      this.statusObservers.forEach(observer => observer(status));
    }
  }

  /**
   * Get current connection status
   */
  public static getConnectionStatus(): 'disconnected' | 'connecting' | 'connected' {
    return this.connectionStatus;
  }

  /**
   * Automatically connect to WebSocket server
   */
  public static async autoConnect(): Promise<void> {
    if (this.websocket?.isConnected() || this.isConnecting) {
      return;
    }

    this.setConnectionStatus('connecting');
    const url = this.getDefaultWebSocketUrl();
    await this.setupWebSocket(url);
  }

  /**
   * Local commands that can be executed without WebSocket connection
   */
  private static LOCAL_COMMANDS: Record<string, ((args: string[]) => ExecutionResult | Promise<ExecutionResult>)> = {
    clear: (): ExecutionResult => ({ 
      success: true, 
      isLocalCommand: true, 
      data: { clearScreen: true } 
    }),
    cls: (): ExecutionResult => ({ 
      success: true, 
      isLocalCommand: true, 
      data: { clearScreen: true } 
    }),
    connect: async (args: string[]): Promise<ExecutionResult> => {
      const url = args[0] || FrontendExecutor.getDefaultWebSocketUrl();
      
      if (FrontendExecutor.isConnecting) {
        return { 
          success: false, 
          isLocalCommand: true, 
          error: 'Already attempting to connect to WebSocket server.' 
        };
      }

      if (FrontendExecutor.websocket?.isConnected()) {
        return { 
          success: false, 
          isLocalCommand: true, 
          error: 'Already connected to WebSocket server.' 
        };
      }

      FrontendExecutor.connectionStatus = 'connecting';
      FrontendExecutor.isConnecting = true;
      
      try {
        await FrontendExecutor.setupWebSocket(url);
        FrontendExecutor.connectionStatus = 'connected';
        return { 
          success: true, 
          isLocalCommand: true, 
          data: { message: 'Connected to WebSocket server.' } 
        };
      } catch (error: unknown) {
        FrontendExecutor.connectionStatus = 'disconnected';
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return { 
          success: false, 
          isLocalCommand: true, 
          error: `Failed to connect to WebSocket: ${errorMessage}` 
        };
      } finally {
        FrontendExecutor.isConnecting = false;
      }
    },
    disconnect: (): ExecutionResult => {
      if (FrontendExecutor.websocket) {
        FrontendExecutor.websocket.disconnect();
        FrontendExecutor.websocket = null;
        return { 
          success: true, 
          isLocalCommand: true, 
          data: { message: 'Disconnected from WebSocket server.' } 
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
          '  mode <mode>             - Switch display mode (raw/content/source)',
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
    mode: (args: string[]): ExecutionResult => {
      const validModes = ['raw', 'content', 'source'];
      const newMode = args[0];
      
      if (!newMode) {
        return {
          success: false,
          isLocalCommand: true,
          error: 'Please specify a mode: raw, content, or source'
        };
      }

      if (!validModes.includes(newMode)) {
        return {
          success: false,
          isLocalCommand: true,
          error: `Invalid mode: ${newMode}. Valid modes are: raw, content, source`
        };
      }

      return {
        success: true,
        isLocalCommand: true,
        data: {
          command: `mode ${newMode}`,
          message: `Display mode changed to: ${newMode}`
        }
      };
    },
    status: (): ExecutionResult => ({
      success: true,
      isLocalCommand: true,
      data: {
        message: FrontendExecutor.websocket?.isConnected() 
          ? 'Connected to WebSocket server.' 
          : 'Not connected to WebSocket server.'
      }
    })
  };

  /**
   * Gets the default WebSocket URL from config
   */
  private static getDefaultWebSocketUrl(): string {
    return config.api.websocket;
  }

  /**
   * Gets the authentication token from AWS Amplify
   */
  private static async getAuthToken(): Promise<string | null> {
    try {
      const session = await fetchAuthSession();
      return session.tokens?.idToken?.toString() || null;
    } catch (error) {
      console.error('Error getting auth token:', error);
      return null;
    }
  }

  /**
   * Sets up WebSocket connection with authentication
   */
  private static async setupWebSocket(url: string) {
    if (FrontendExecutor.websocket) {
      FrontendExecutor.websocket.disconnect();
    }
    
    try {
      const token = await FrontendExecutor.getAuthToken();
      
      if (!token) {
        throw new Error('Failed to get authentication token. Please log in again.');
      }
      
      const options: WebSocketOptions = { url, token };
      FrontendExecutor.websocket = new WebSocketService(options);
      
      // Set up connection change handler
      FrontendExecutor.websocket.onConnectionChange((isConnected) => {
        FrontendExecutor.setConnectionStatus(isConnected ? 'connected' : 'disconnected');
      });

      FrontendExecutor.setupWebSocketHandlers();
      await FrontendExecutor.websocket.connect();
    } catch (error) {
      FrontendExecutor.setConnectionStatus('disconnected');
      console.error('Failed to connect to WebSocket:', error);
      throw error;
    }
  }

  /**
   * Sets up WebSocket message and connection change handlers
   */
  private static setupWebSocketHandlers() {
    if (!FrontendExecutor.websocket) return;

    // Set up message handler
    FrontendExecutor.websocket.onMessage((message) => {
      console.log('Received WebSocket message:', message);

      // Update connection status on first message
      if (FrontendExecutor.websocket?.isConnected()) {
        FrontendExecutor.connectionStatus = 'connected';
      }

      // Handle different message types
      if (message.type === 'terminal' || message.type === 'error') {
        const commandId = message.data?.commandId;
        const pendingCommand = commandId ? FrontendExecutor.pendingCommands.get(commandId) : null;

        if (pendingCommand) {
          clearTimeout(pendingCommand.timeoutId);
          FrontendExecutor.pendingCommands.delete(commandId);
          
          if (message.type === 'error') {
            pendingCommand.resolve({
              success: false,
              error: message.data.content || 'Unknown error occurred'
            });
          } else {
            // Handle terminal responses
            pendingCommand.resolve({
              success: true,
              data: {
                type: message.type,
                data: {
                  content: message.data.content,
                  source: message.data.source || 'unknown',
                  timestamp: message.data.timestamp
                }
              }
            });
          }
        } else {
          // Handle messages without a commandId
          const result: ExecutionResult = {
            success: true,
            data: {
              type: message.type,
              data: {
                content: message.data.content,
                source: message.data.source || 'unknown',
                timestamp: message.data.timestamp
              }
            }
          };
          
          // If there are any pending commands, resolve the first one
          if (FrontendExecutor.pendingCommands.size > 0) {
            const [firstCommandId] = FrontendExecutor.pendingCommands.keys();
            const pendingCommand = FrontendExecutor.pendingCommands.get(firstCommandId);
            if (pendingCommand) {
              clearTimeout(pendingCommand.timeoutId);
              FrontendExecutor.pendingCommands.delete(firstCommandId);
              pendingCommand.resolve(result);
            }
          }
        }
      }
    });
  }

  /**
   * Executes a command either locally or through WebSocket
   * @param input The command to execute
   * @param mode The execution mode (command or prompt)
   */
  static async execute(input: string, mode: 'command' | 'prompt'): Promise<ExecutionResult> {
    const trimmedInput = input.trim();
    if (!trimmedInput) return { success: true, data: null };

    const [command, ...args] = trimmedInput.split(/\s+/);
    
    // Check for local commands first
    const localCommandFn = FrontendExecutor.LOCAL_COMMANDS[command as keyof typeof FrontendExecutor.LOCAL_COMMANDS];
    if (localCommandFn) {
      const result = localCommandFn.call(FrontendExecutor, args);
      return result instanceof Promise ? await result : result;
    }

    // Execute remote command if WebSocket is connected
    if (FrontendExecutor.websocket?.isConnected()) {
      return FrontendExecutor.executeRemoteCommand(trimmedInput, mode);
    }

    return {
      success: false,
      error: 'Not connected to WebSocket server. Use "connect" to establish a connection.'
    };
  }

  /**
   * Executes a command through WebSocket
   */
  private static async executeRemoteCommand(input: string, _mode: 'command' | 'prompt'): Promise<ExecutionResult> {
    const commandId = Date.now().toString();
    
    return new Promise<ExecutionResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        FrontendExecutor.pendingCommands.delete(commandId);
        reject(new Error('Command execution timed out'));
      }, 30000);
      
      FrontendExecutor.pendingCommands.set(commandId, { resolve, reject, timeoutId });
      
      try {
        // Send only the input string as rawData
        const message = {
          action: 'brain/terminal',
          data: {
            rawData: input,
            requestStreaming: false,
            commandId,
            timestamp: new Date().toISOString(),
            source: 'terminal'
          }
        };
        
        console.log('Sending WebSocket message:', message); // Debug log
        FrontendExecutor.websocket!.sendMessage(message);
      } catch (error) {
        clearTimeout(timeoutId);
        FrontendExecutor.pendingCommands.delete(commandId);
        reject(new Error('Failed to send command to server'));
      }
    })
    .catch(error => ({
      success: false,
      error: `Error executing command: ${error.message}`
    }));
  }
} 