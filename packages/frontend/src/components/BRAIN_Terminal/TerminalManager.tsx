import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { BrainConnectionService} from './BrainConnectionService';
import { TerminalFormatter, TerminalMode, BrainThoughtProcess } from './TerminalModes';
import config from '../../config';
import { ConnectionStatus } from './WebSocketConnection';

// Message type definitions
type TerminalResponseMessage = { 
  action: 'brain/terminal/response'; 
  data: { 
    output?: string; 
    content?: string;
    command?: string;
    source?: string;
  }; 
  commandId?: string 
};

type ErrorMessage = { 
  action: 'error'; 
  data: { 
    message: string; 
    details?: any 
  }; 
  commandId?: string 
};

// Terminal configuration and customization options
interface TerminalOptions {
  welcomeMessage?: string;      // Custom welcome message to display
  prompt?: string;             // Custom prompt string
  mode?: 'command' | 'prompt'; // Terminal operation mode
  displayMode?: TerminalMode;  // How messages are displayed (raw/content/source)
}

// Extended options including response handler
interface TerminalManagerOptions extends TerminalOptions {
  onResponse?: (response: any) => void;  // Callback for handling command responses
}

/**
 * TerminalManager class handles the terminal UI and user interactions.
 * It manages command input, history, and display formatting.
 */
export class TerminalManager {
  // XTerm.js instances
  private term: Terminal;
  private fitAddon: FitAddon;
  
  // Message formatting
  private formatter: TerminalFormatter;
  
  // Command history management
  private commandBuffer = {
    current: '',              // Current command being typed
    history: [] as string[],  // Previous commands
    historyIndex: -1         // Current position in history when navigating
  };

  // Terminal state
  private readonly prompt: string = 'brainsOS> ';
  private currentMode: 'command' | 'prompt' = 'command';
  private readonly onResponse?: (response: any) => void;
  private _isExecuting = false;  // Prevents concurrent command execution
  private options: TerminalManagerOptions;
  
  private lastConnectionStatus: ConnectionStatus = 'disconnected';

  // Terminal theme configuration
  private static readonly TERMINAL_THEME = {
    background: '#1e1e1e',
    foreground: '#d4d4d4',
    cursor: '#d4d4d4',
    selectionBackground: '#264f78',
    red: '#F44747',
    green: '#6A9955',
    yellow: '#DCDCAA',
  };

  /**
   * Creates a new terminal instance and initializes it.
   * @param container HTML element to mount the terminal
   * @param options Terminal configuration options
   */
  constructor(container: HTMLElement, options?: TerminalManagerOptions) {
    // Initialize terminal with default options
    this.options = {
      welcomeMessage: 'Welcome to brainsOS Terminal',
      prompt: 'brainsOS> ',
      mode: 'command',
      displayMode: 'content',
      ...options
    };
    this.currentMode = this.options.mode || 'command';

    // Initialize terminal instance
    this.term = new Terminal({
      theme: TerminalManager.TERMINAL_THEME,
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    });

    // Initialize addons
    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);

    // Mount terminal to container
    this.term.open(container);
    this.fit();

    // Initialize formatter
    this.formatter = new TerminalFormatter(this.options.displayMode || 'content');

    // Setup event listeners
    this.setupEventListeners();
    this.setupResizeHandler();

    // Write welcome message
    this.writeWelcomeMessage();

    // Register Message Handlers
    this.registerMessageHandlers();

    // Auto-connect via BrainConnectionService
    BrainConnectionService.onConnectionStatusChange(this.handleConnectionStatusUpdate.bind(this));
    BrainConnectionService.autoConnect().catch(error => {
      console.error('TerminalManager: Initial autoConnect failed:', error);
      this.writeError(`Failed to initiate connection: ${error.message}`);
      this.term.write(this.prompt);
    });
  }

  private registerMessageHandlers(): void {
    BrainConnectionService.initialize();

    BrainConnectionService.registerMessageHandler('brain/terminal/response', 
      (message) => this.handleTerminalResponse(message as TerminalResponseMessage));
    BrainConnectionService.registerMessageHandler('brain/mcp/status', this.handleMcpStatusUpdate.bind(this));
    BrainConnectionService.registerMessageHandler('brain/terminal/status/mcp', this.handleTerminalMcpStatus.bind(this));
    BrainConnectionService.registerMessageHandler('brain/mcp/response', this.handleMcpResponse.bind(this));
    BrainConnectionService.registerMessageHandler('error', 
      (message) => this.handleErrorResponse(message as ErrorMessage));
    console.log("TerminalManager: Message handlers registered.");
  }

  private handleTerminalResponse(message: TerminalResponseMessage): void {
    console.log('TerminalManager received terminal response:', JSON.stringify(message, null, 2));
    
    // Extract content from the response - support both formats
    const responseData = message.data;
    let content = responseData.output;
    
    // If no output field, check for content field (new format)
    if (!content && responseData.content) {
      content = responseData.content;
    }
    
    const source = responseData.source || responseData.command;

    if (content) {
      // Try to parse content to check for command
      try {
        const parsedContent = typeof content === 'string' ? JSON.parse(content) : content;
        
        // Check if this contains a command - if so, show plan but not full response
        if (parsedContent.command && typeof parsedContent.command === 'object') {
          console.log(
            `[Command detected] ${parsedContent.command.name || 'unnamed'}: `, 
            parsedContent.command
          );
          
          // Extract plan from thoughts if available
          if (parsedContent.thoughts && Array.isArray(parsedContent.thoughts.plan) && parsedContent.thoughts.plan.length > 0) {
            const plan = parsedContent.thoughts.plan;
            
            // Show a simplified plan to the user
            this.writeMessage('\n[PLAN]');
            plan.forEach((step: string, index: number) => {
              this.writeMessage(`  ${index + 1}. ${step}`);
            });
            
            // Add information about the command being executed
            const cmdName = parsedContent.command.name;
            const cmdArgs = parsedContent.command.args 
              ? Object.entries(parsedContent.command.args)
                .map(([k, v]) => `${k}: ${JSON.stringify(v)}`)
                .join(', ')
              : '';
            
            this.writeMessage(`\n[EXECUTING] ${cmdName}(${cmdArgs})\n`);
          } else if (parsedContent.thoughts?.speak) {
            // If no plan but we have speak content, show that
            this.writeMessage(`\n${parsedContent.thoughts.speak}\n`);
            this.writeMessage(`\n[EXECUTING] ${parsedContent.command.name}...\n`);
          } else {
            // Fallback if no plan or speak content
            this.writeMessage(`\n[EXECUTING] ${parsedContent.command.name}...\n`);
          }
          
          // Don't reset terminal state for command messages
          // since we're waiting for the final response
          return;
        }

        // Continue with normal processing for non-command messages
        let formattedContent = content;
        const currentMode = this.formatter.getMode();

        if (currentMode === 'raw') {
          formattedContent = JSON.stringify(responseData);
        } else {
          // Extract speech content from thoughts if available
          const speakContent = parsedContent.thoughts?.speak || 
                              (typeof parsedContent === 'string' ? parsedContent : JSON.stringify(parsedContent));

          if (currentMode === 'content') {
            formattedContent = speakContent;
          } else if (currentMode === 'source' && source) {
            formattedContent = `[${source || 'response'}] ${speakContent}`;
          } else {
            formattedContent = speakContent;
          }
        }
        this.writeMessage('\n' + formattedContent + '\n');
      } catch (parseError) {
        console.warn('Failed to parse content as JSON:', parseError);
        // Handle unparseable content as plain text
        const currentMode = this.formatter.getMode();
        let formattedContent = content;
        
        if (currentMode === 'raw') {
          formattedContent = JSON.stringify(responseData);
        } else if (currentMode === 'source' && source) {
          formattedContent = `[${source || 'response'}] ${content}`;
        }
        
        this.writeMessage('\n' + formattedContent + '\n');
      }
    } else {
      this.writeMessage('\n[Empty Response]\n');
    }

    // Mark command as complete and write prompt
    this._isExecuting = false;
    this.term.write(this.prompt);
  }

  private handleErrorResponse(message: ErrorMessage): void {
    const errorMessage = message.data?.message || 'An error occurred';
    this.writeError(errorMessage + '\n');
    
    // Mark command as complete and write prompt
    this._isExecuting = false;
    this.term.write(this.prompt);
  }

  private handleMcpStatusUpdate(message: any): void {
    // Log MCP status but don't display it on terminal
    console.log('MCP Status Update:', JSON.stringify(message.data, null, 2));
    
    // Status messages shouldn't affect terminal state
    // We don't need to show the prompt here since we're not displaying anything
  }

  private handleTerminalMcpStatus(message: any): void {
    // Log the terminal MCP status update but don't display on terminal
    console.log('Terminal MCP Status Update:', 
      `${message.data.status} - ${message.data.message || ''}`, 
      message.data);
    
    // Status messages shouldn't affect terminal state
  }

  private handleMcpResponse(message: any): void {
    // Log MCP responses but don't display them on terminal
    console.log('MCP Tool Response:', 
      `Tool: ${message.data.toolName}, Success: ${message.data.success}`, 
      message.data);
    
    // MCP responses shouldn't affect terminal state
  }

  private handleConnectionStatusUpdate(status: ConnectionStatus): void {
    if (status !== this.lastConnectionStatus) {
      console.log(`TerminalManager: Connection status updated to ${status}`);
      this.lastConnectionStatus = status;
      this.writeWelcomeMessage();
      this.term.write(this.prompt + this.commandBuffer.current);
    }
  }

  /**
   * Sets up the terminal resize handler to maintain proper dimensions
   */
  private setupResizeHandler(): void {
    const performFit = () => {
      try {
        this.fitAddon.fit();
        this.term.refresh(0, this.term.rows - 1);
      } catch (e) {
        console.warn('Failed to fit terminal:', e);
      }
    };

    // Initial fit
    setTimeout(performFit, 0);

    // Handle window resizes
    window.addEventListener('resize', () => {
      requestAnimationFrame(performFit);
    });
  }

  /**
   * Sets up keyboard event listeners for terminal interaction
   */
  private setupEventListeners(): void {
    this.term.onData(data => {
      // Handle special key sequences
      switch (data) {
        case '\u001b[A':  // Up arrow
          this.navigateHistory('up');
          return;
        case '\u001b[B':  // Down arrow
          this.navigateHistory('down');
          return;
        case '\r':        // Enter
          this.handleEnterKey();
          return;
        case '\u007f':    // Backspace
          this.handleBackspace();
          return;
        case '\u0003':    // Ctrl+C
          this.handleCtrlC();
          return;
        default:
          // Regular input (including paste)
          const cleanData = data.replace(/[\r\n]/g, '');
          this.commandBuffer.current += cleanData;
          this.term.write(cleanData);
      }
    });
  }

  /**
   * Handles backspace key press
   */
  private handleBackspace(): void {
    if (this.commandBuffer.current.length > 0) {
      this.commandBuffer.current = this.commandBuffer.current.slice(0, -1);
      this.term.write('\b \b');
    }
  }

  /**
   * Handles Ctrl+C key press
   */
  private handleCtrlC(): void {
    this.term.write('^C\r\n' + this.prompt);
    this.commandBuffer.current = '';
    this._isExecuting = false;
  }

  /**
   * Writes the welcome message and system information
   */
  private writeWelcomeMessage(): void {
    const version = "0.1.0";
    const title = `BRAINS OS v${version}`;
    const separator = '*'.repeat(title.length);
    
    this.term.clear();
    
    // Write header
    this.term.writeln(title);
    this.term.writeln(separator);
    
    // System information and help text
    const lines = [
      'Welcome to BRAINS OS Console.',
      '',
      '╭─ System Info ' + '─'.repeat(48),
      `│  WebSocket: ${config.api.websocket}`,
      `│    Status: ${this.formatConnectionState(this.lastConnectionStatus)}`,
      '╰' + '─'.repeat(60),
      '',
      'Available display modes:',
      `  • raw     - Show complete JSON payloads (Current: ${this.formatter.getMode() === 'raw' ? '✓' : ' '})`,
      `  • content - Show formatted content (Current: ${this.formatter.getMode() === 'content' ? '✓' : ' '})`,
      `  • source  - Show source-prefixed content (Current: ${this.formatter.getMode() === 'source' ? '✓' : ' '})`,
      '',
      'Type \'help\' for a list of available commands.',
      ''
    ];

    lines.forEach(line => this.term.writeln(line));

    // Don't write prompt here, let handleEnterKey or message handlers do it
  }

  /**
   * Formats the connection state with color
   */
  private formatConnectionState(status: ConnectionStatus): string {
    switch (status) {
      case 'connected':
        return '\x1b[32m✓ Connected\x1b[0m';
      case 'connecting':
        return '\x1b[33m↻ Connecting...\x1b[0m';
      case 'disconnected':
        return '\x1b[31m✗ Disconnected\x1b[0m';
      default:
        return '\x1b[31m✗ Disconnected\x1b[0m';
    }
  }

  /**
   * Writes a regular message to the terminal
   */
  private writeMessage(message: string): void {
    message.split('\n').forEach(line => {
      this.term.writeln(`\x1b[94m  ${line}\x1b[0m`);
    });
  }

  /**
   * Writes an error message in red
   */
  private writeError(message: string): void {
    message.split('\n').forEach(line => {
      this.term.writeln(`\x1b[31m  ✗ ${line}\x1b[0m`);
    });
  }

  /**
   * Writes a success message in green
   */
  private writeSuccess(message: string): void {
    this.term.writeln(`\x1b[32m  ✓ ${message}\x1b[0m`);
  }

  /**
   * Handles command execution when Enter is pressed
   */
  private async handleEnterKey(): Promise<void> {
    this.term.write('\r\n');
    const input = this.commandBuffer.current.trim();
    
    if (input) {
      // Add to command history
      this.commandBuffer.history.push(input);
      this.commandBuffer.historyIndex = this.commandBuffer.history.length;
      
      // Reset command buffer *before* execution starts
      const commandToExecute = this.commandBuffer.current;
      this.commandBuffer.current = '';
      
      if (this._isExecuting) {
        this.writeError("Already executing a command.");
        this.term.write(this.prompt);
        return;
      }

      try {
        this._isExecuting = true;
        // Execute the command using BrainConnectionService
        const result = await BrainConnectionService.execute(commandToExecute, this.currentMode);

        // Handle *local* command results specifically if needed
        if (result.isLocalCommand) {
          if (result.data?.clearScreen) {
            // Do nothing here, welcome message refreshed on status change
          } else if (result.data?.command?.startsWith('mode ')) {
            // Handle mode change display *after* command success
            const newMode = result.data.command.split(' ')[1] as TerminalMode;
            if (['raw', 'content', 'source'].includes(newMode)) {
              this.formatter.setMode(newMode);
              this.writeSuccess(`Display mode changed to: ${newMode}\n`);
              this.writeWelcomeMessage();
            }
          } else if (result.data?.message) {
            // Display messages from local commands (connect, disconnect, help, status)
            result.success ? this.writeSuccess('\n' + result.data.message + '\n') : this.writeMessage('\n' + result.data.message + '\n');
          }
          // Pass local result back if callback exists
          this.onResponse?.(result);
          
          // For local commands, we reset and show prompt here
          this._isExecuting = false;
          this.term.write(this.prompt);
        }

        // Handle direct errors from the execute call (e.g., connection error, timeout)
        if (!result.success && result.error) {
          this.writeError(result.error + '\n');
          // Reset for errors too
          this._isExecuting = false;
          this.term.write(this.prompt);
        }

        // For remote commands, we DON'T reset _isExecuting here - it will be reset
        // when we receive the response from the server in handleTerminalResponse or handleErrorResponse

      } catch (error) {
        // Catch errors from BrainConnectionService.execute itself (should be rare now)
        const errorMessage = error instanceof Error ? error.message : 'Unknown execution error';
        this.writeError(`Execution Error: ${errorMessage}\n`);
        this._isExecuting = false;
        this.term.write(this.prompt);
      }
    } else {
      // If input is empty, just write prompt again
      this.term.write(this.prompt);
    }
  }

  /**
   * Navigates through command history using up/down arrows
   */
  private navigateHistory(direction: 'up' | 'down'): void {
    if (direction === 'up' && this.commandBuffer.historyIndex > 0) {
      // Navigate up through history
      this.commandBuffer.historyIndex--;
      const historyEntry = this.commandBuffer.history[this.commandBuffer.historyIndex];
      this.setCurrentLine(historyEntry);
    } else if (direction === 'down') {
      if (this.commandBuffer.historyIndex < this.commandBuffer.history.length - 1) {
        // Navigate down through history
        this.commandBuffer.historyIndex++;
        const historyEntry = this.commandBuffer.history[this.commandBuffer.historyIndex];
        this.setCurrentLine(historyEntry);
      } else {
        // Clear line when reaching end of history
        this.commandBuffer.historyIndex = this.commandBuffer.history.length;
        this.setCurrentLine('');
      }
    }
  }

  /**
   * Updates the current command line with new text
   */
  private setCurrentLine(newLine: string): void {
    // Clear current line
    this.term.write('\r' + this.prompt + ' '.repeat(this.commandBuffer.current.length) + '\r' + this.prompt);
    
    // Write new line
    this.commandBuffer.current = newLine;
    this.term.write(newLine);
  }

  /**
   * Public method to manually fit the terminal to its container
   */
  public fit(): void {
    requestAnimationFrame(() => {
      try {
        this.fitAddon.fit();
        this.term.refresh(0, this.term.rows - 1);
      } catch (e) {
        console.warn('Failed to fit terminal:', e);
      }
    });
  }

  /**
   * Public method to programmatically run a command
   */
  public async runCommand(command: string): Promise<void> {
    if (this._isExecuting) return;
    
    // Clear current line and write the command
    this.term.write('\r' + this.prompt + ' '.repeat(this.commandBuffer.current.length) + '\r' + this.prompt);
    this.term.write(command);
    
    // Update buffer and execute
    this.commandBuffer.current = command;
    await this.handleEnterKey();
  }

  /**
   * Public method to update terminal options
   */
  public updateOptions(newOptions: Partial<TerminalOptions>): void {
    const oldMode = this.formatter.getMode();
    this.options = { ...this.options, ...newOptions };

    if (newOptions.mode) {
      this.currentMode = newOptions.mode;
    }
    if (newOptions.displayMode && newOptions.displayMode !== oldMode) {
      this.formatter.setMode(newOptions.displayMode);
      this.writeWelcomeMessage();
      this.term.write(this.prompt + this.commandBuffer.current);
    } else if (newOptions.welcomeMessage) {
      this.writeWelcomeMessage();
      this.term.write(this.prompt + this.commandBuffer.current);
    }
  }

  public dispose(): void {
    this.term.dispose();
  }
} 