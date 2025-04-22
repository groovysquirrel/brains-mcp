import config from '../../../config';
import { WebSocketConnection, ConnectionStatus } from './WebSocketConnection';

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

// --- Message Type Definitions ---
type Message = { action: string; data: any; commandId?: string };
type TerminalResponseMessage = { action: 'brain/terminal/response'; data: { output: string; command?: string }; commandId?: string };
type McpStatusMessage = { action: 'brain/mcp/status'; data: { status: string; message?: string } };
type TerminalContentMessage = { action: 'brain/terminal/content'; data: { content: any } };
type ErrorMessage = { action: 'error'; data: { message: string; details?: any }; commandId?: string };
type MessageHandler = (message: TerminalResponseMessage | McpStatusMessage | TerminalContentMessage | ErrorMessage | Message) => void;
// --- End Message Type Definitions ---

/**
 * BrainConnectionService orchestrates commands, manages WebSocket communication via WebSocketConnection,
 * and routes messages to registered handlers.
 */
export class BrainConnectionService {
  // --- REMOVED: Direct WebSocket properties ---
  // private static websocket: WebSocketService | null = null;
  // private static isConnecting: boolean = false;

  // --- NEW: WebSocketConnection instance ---
  private static connection: WebSocketConnection | null = null;
  private static isInitialized = false;
  // --- End NEW ---

  private static pendingCommands: Map<string, { 
    resolve: (value: ExecutionResult) => void, 
    reject: (reason: any) => void,
    timeoutId: NodeJS.Timeout
  }> = new Map();
  private static connectionStatusInternal: ConnectionStatus = 'disconnected'; // Internal state for observers
  private static statusObservers: ((status: ConnectionStatus) => void)[] = [];

  // Message Handling Logic (Registry and Methods)
  private static messageHandlers: Record<string, MessageHandler> = {};

  public static registerMessageHandler(action: string, handler: MessageHandler): void {
    this.ensureInitialized(); // Ensure connection/handlers are ready
    if (this.messageHandlers[action]) {
      console.warn(`Overwriting handler for action: ${action}`);
    }
    this.messageHandlers[action] = handler;
    console.log(`Registered handler for action: ${action}`);
  }

  public static unregisterMessageHandler(action: string): void {
    delete this.messageHandlers[action];
  }

  // --- NEW: Initialization and Event Handling ---
  public static initialize(): void {
    if (this.isInitialized) return;
    console.log("Initializing BrainConnectionService...");
    this.connection = new WebSocketConnection(this.getDefaultWebSocketUrl());

    // Bind listeners to maintain correct `this` context
    this.connection.on('message', this.handleRawMessage.bind(this));
    this.connection.on('connectionChange', this.handleConnectionChange.bind(this));
    this.connection.on('error', this.handleConnectionError.bind(this));
    this.isInitialized = true;
  }

  private static ensureInitialized(): void {
      if (!this.isInitialized || !this.connection) {
          this.initialize();
      }
      if (!this.connection) { // Check again after initialization attempt
          throw new Error("BrainConnectionService failed to initialize.");
      }
  }

  private static handleRawMessage(rawData: string | any): void {
    try {
      // Handle both string and object inputs
      const message = typeof rawData === 'string' ? JSON.parse(rawData) : rawData;
      
      // Detailed logging based on message type
      if (typeof message.action === 'string') {
        const action = message.action;
        if (action.startsWith('brain/terminal/status')) {
          console.debug(`Received terminal status message: ${action}`, message);
        } else if (action.startsWith('brain/mcp')) {
          console.debug(`Received MCP message: ${action}`, message);
        } else if (action === 'brain/terminal/response') {
          console.debug(`Received terminal response`, message);
        } else {
          console.debug(`Received message with action: ${action}`, message);
        }
      } else {
        console.debug('Received WebSocket message with unknown structure:', message);
      }

      // Helper to find commandId from different message formats
      const findCommandId = (msg: any): string | undefined => {
        // Check top level
        if (typeof msg.commandId === 'string') return msg.commandId;
        
        // Check in data property
        if (msg.data && typeof msg.data.commandId === 'string') return msg.data.commandId;
        
        // Check in conversationId (sometimes used as commandId)
        if (typeof msg.conversationId === 'string') return msg.conversationId;
        if (msg.data && typeof msg.data.conversationId === 'string') return msg.data.conversationId;
        
        return undefined;
      };

      // Extract commandId to check for pending commands
      const commandId = findCommandId(message);

      // Reset timeout for pending command (if we have one) regardless of whether this is the final response
      if (commandId && this.pendingCommands.has(commandId)) {
        const pending = this.pendingCommands.get(commandId)!;
        
        // Clear existing timeout
        clearTimeout(pending.timeoutId);
        
        // Set a new timeout
        pending.timeoutId = setTimeout(() => {
          console.warn(`Command ${commandId} timed out after receiving partial responses`);
          this.pendingCommands.delete(commandId);
          pending.reject(new Error('Command timed out after partial responses'));
        }, 60000); // Extended timeout for commands with intermediate responses
        
        console.log(`Reset timeout for command ${commandId} after receiving a related message`);
      }
      
      // Handle registered message handlers first
      if (typeof message.action === 'string' && typeof message.data !== 'undefined') {
        const handler = this.messageHandlers[message.action];
        if (handler) {
          try {
            handler(message as Message); // Handle standard message
          } catch (error) {
            console.error(`Error in handler for action ${message.action}:`, error, message);
          }
        }
      }
      
      // Handle pending command resolution (if found)
      // Only resolve for final responses (typically brain/terminal/response with no command)
      if (commandId && this.pendingCommands.has(commandId) && this.isFinalResponse(message)) {
        console.log(`Found final response for pending command with ID: ${commandId}`);
        const pending = this.pendingCommands.get(commandId)!;
        clearTimeout(pending.timeoutId);
        
        // Create result based on message structure
        const result: ExecutionResult = {
          // Determine success based on message type or presence of error
          success: message.action !== 'error' && !message.error,
          data: message.data || message, // Use data property if available, otherwise whole message
          error: message.error || (message.action === 'error' ? message.data?.message : undefined)
        };
        
        pending.resolve(result);
        this.pendingCommands.delete(commandId);
        console.log(`Resolved pending command ${commandId}`);
      } else if (typeof message.action === 'string' && !this.messageHandlers[message.action]) {
        // Message with action but no handler and no matching pending command
        console.warn(`No handler or pending command found for action: ${message.action}`, message);
      }
    } catch (error) {
      console.error('Failed to parse or handle WebSocket message:', rawData, error);
    }
  }

  // Determine if a message is the final response that should resolve a command
  private static isFinalResponse(message: any): boolean {
    // If it's an error message, it's a final response
    if (message.action === 'error') return true;
    
    // If it's a terminal response, check if it has a command or not
    if (message.action === 'brain/terminal/response' && message.data?.content) {
      try {
        // Parse the content if it's a string
        const content = typeof message.data.content === 'string' 
          ? JSON.parse(message.data.content) 
          : message.data.content;
        
        // If there's no command field or command is null, it's a final response
        return !content.command || content.command === null;
      } catch (e) {
        // If parsing fails, assume it's a final response
        return true;
      }
    }
    
    // For brain/terminal/status/mcp actions, completion status indicates final tool response
    if (message.action === 'brain/terminal/status/mcp' && 
        message.data?.status === 'completed') {
      return true;
    }
    
    // Default: not a final response
    return false;
  }

  private static handleConnectionChange(status: ConnectionStatus): void {
    console.log(`BrainConnectionService received connection status: ${status}`);
    this.setConnectionStatus(status);
    if (status === 'disconnected') {
        // Clean up pending commands on disconnect
        this.pendingCommands.forEach(cmd => {
           clearTimeout(cmd.timeoutId);
           cmd.reject('WebSocket disconnected');
        });
        this.pendingCommands.clear();
    }
  }

  private static handleConnectionError(error: Error): void {
      console.error("BrainConnectionService received connection error:", error);
      // Optionally inform status observers or trigger specific error handling
  }
  // --- End NEW ---


  /**
   * Subscribe to connection status changes
   */
  public static onConnectionStatusChange(callback: (status: ConnectionStatus) => void): () => void {
    this.statusObservers.push(callback);
    callback(this.connectionStatusInternal); // Use internal state for immediate callback
    return () => {
      this.statusObservers = this.statusObservers.filter(cb => cb !== callback);
    };
  }

  /**
   * Update internal connection status and notify observers
   */
  private static setConnectionStatus(status: ConnectionStatus): void {
    if (this.connectionStatusInternal !== status) {
      this.connectionStatusInternal = status;
      this.statusObservers.forEach(observer => observer(status));
    }
  }

  /**
   * Get current connection status from the underlying connection
   */
  public static getConnectionStatus(): ConnectionStatus {
    // Ensure initialized to check status, but don't auto-connect here
    if (!this.isInitialized || !this.connection) {
        return 'disconnected';
    }
    return this.connection.getStatus();
  }

  /**
   * Automatically connect to WebSocket server if not already connected.
   */
  public static async autoConnect(): Promise<void> {
    this.ensureInitialized(); // Initialize if needed
    if (this.connection!.isConnected()) {
      console.log("AutoConnect: Already connected.");
      return;
    }
    if (this.connection!.getStatus() === 'connecting') {
        console.log("AutoConnect: Connection already in progress.");
        return;
    }
    try {
      console.log("AutoConnect: Attempting connection...");
      await this.connection!.connect(); // Delegate to WebSocketConnection
      console.log("AutoConnect: Connection successful or already handled.");
    } catch (error) {
      console.error("AutoConnect failed:", error);
      // Connection status should be updated via handleConnectionChange
    }
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
    connect: async (_args: string[]): Promise<ExecutionResult> => {
      // Args might specify URL in future, but currently uses default
      BrainConnectionService.ensureInitialized();

      if (BrainConnectionService.connection!.isConnected()) {
        return { 
          success: false, 
          isLocalCommand: true, 
          error: 'Already connected to WebSocket server.' 
        };
      }
       if (BrainConnectionService.connection!.getStatus() === 'connecting') {
        return { 
          success: false, 
          isLocalCommand: true, 
          error: 'Connection attempt already in progress.' 
        };
      }

      try {
        await BrainConnectionService.connection!.connect();
        // Status updates are handled by events
        return { 
          success: true, 
          isLocalCommand: true, 
          data: { message: 'Connection initiated successfully.' } // Message reflects initiation
        };
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return { 
          success: false, 
          isLocalCommand: true, 
          error: `Failed to connect to WebSocket: ${errorMessage}` 
        };
      }
    },
    disconnect: (): ExecutionResult => {
      BrainConnectionService.ensureInitialized();
      if (!BrainConnectionService.connection!.isConnected() && BrainConnectionService.connection!.getStatus() !== 'connecting') {
          return { 
             success: false, 
             isLocalCommand: true, 
             error: 'Not connected to any WebSocket server.' 
           };
      }
      
      BrainConnectionService.connection!.disconnect();
      return { 
        success: true, 
        isLocalCommand: true, 
        data: { message: 'Disconnected from WebSocket server.' } 
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
    status: (): ExecutionResult => {
      BrainConnectionService.ensureInitialized(); // Ensure connection object exists to check status
      const currentStatus = BrainConnectionService.getConnectionStatus();
      let message = '';
      switch (currentStatus) {
          case 'connected': message = 'Connected to WebSocket server.'; break;
          case 'connecting': message = 'Connecting to WebSocket server...'; break;
          case 'disconnected': message = 'Not connected to WebSocket server.'; break;
          default: message = `Unknown status: ${currentStatus}`; break;
      }
      return { success: true, isLocalCommand: true, data: { message } };
    }
  };

  /**
   * Gets the default WebSocket URL from config
   */
  private static getDefaultWebSocketUrl(): string {
    return config.api.websocket;
  }

  /**
   * Executes a command either locally or through the WebSocket connection.
   */
  static async execute(input: string, mode: 'command' | 'prompt'): Promise<ExecutionResult> {
    this.ensureInitialized(); // Ensure service is ready
    const parts = input.trim().split(/\s+/);
    const command = parts[0].toLowerCase();
    if (!command) return { success: true, data: null };

    // Check for local commands first
    const localCommandFn = BrainConnectionService.LOCAL_COMMANDS[command as keyof typeof BrainConnectionService.LOCAL_COMMANDS];
    if (localCommandFn) {
      try {
        const result = await Promise.resolve(localCommandFn.call(BrainConnectionService, parts.slice(1)));
        return result;
      } catch (error) {
         console.error(`Error executing local command '${command}':`, error);
         return { success: false, isLocalCommand: true, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    }

    // Execute remote command if WebSocket is connected
    if (BrainConnectionService.connection!.isConnected()) {
       try {
            return await BrainConnectionService.sendRemoteRequest(input, mode);
       } catch(error) {
            console.error(`Error sending remote request '${input}':`, error);
            return { success: false, error: error instanceof Error ? error.message : 'Unknown error during remote execution' };
       }
    }

    // If not connected, return error
    return {
      success: false,
      error: 'Not connected. Use "connect" command or wait for auto-connect.'
    };
  }

  /**
   * Sends a request through the WebSocket connection and manages the response.
   */
  private static async sendRemoteRequest(input: string, _mode: 'command' | 'prompt'): Promise<ExecutionResult> {
    this.ensureInitialized(); // Should already be initialized by execute, but double check
    
    const commandId = crypto.randomUUID();
    const requestPayload = {
        action: 'brain/terminal/request',
        data: {
            rawData: input,
            commandId: commandId,
            timestamp: new Date().toISOString(),
            source: 'terminal'
        }
    };

    return new Promise<ExecutionResult>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
          this.pendingCommands.delete(commandId);
          reject(new Error(`Request timed out: ${input}`));
      }, 30000);

      this.pendingCommands.set(commandId, { resolve, reject, timeoutId });

      try {
        // Delegate sending to WebSocketConnection
        BrainConnectionService.connection!.sendMessage(requestPayload);
        console.debug('Sent request via connection service:', requestPayload);
      } catch (error) {
         // Error during send (e.g., connection closed unexpectedly)
         this.pendingCommands.delete(commandId);
         clearTimeout(timeoutId);
         console.error('Failed to send request via connection service:', error);
         reject(error); // Reject the promise for execute to catch
      }
    });
  }
} 