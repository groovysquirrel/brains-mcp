import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { FrontendExecutor, ExecutionResult } from './FrontendExecutor';
import { TerminalFormatter, TerminalMode } from './TerminalModes';
import config from '../../config';


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
  private readonly mode: 'command' | 'prompt' = 'command';
  private readonly onResponse?: (response: any) => void;
  private _isExecuting = false;  // Prevents concurrent command execution
  private options: TerminalManagerOptions;
  
  private connectionStatusInterval: NodeJS.Timeout | null = null;
  private lastConnectionStatus: 'disconnected' | 'connecting' | 'connected' = 'disconnected';

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

    // Write welcome message and check auth
    this.writeWelcomeMessage();


    // Start automatic connection
    this.startAutoConnection();
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
      `│    Status: ${this.formatConnectionState()}`,
      '╰' + '─'.repeat(60),
      '',
      'Available display modes:',
      '  • raw     - Show complete JSON payloads',
      '  • content - Show formatted content (default)',
      '  • source  - Show source-prefixed content',
      '',
      'Type \'help\' for a list of available commands.',
      ''
    ];

    lines.forEach(line => this.term.writeln(line));

    this.term.write(this.prompt);
  }

  /**
   * Formats the connection state with color
   */
  private formatConnectionState(): string {
    const status = FrontendExecutor.getConnectionStatus();
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
      
      try {
        if (this._isExecuting) return;
        this._isExecuting = true;

        // Execute the command
        const result = await FrontendExecutor.execute(input, this.mode);
        
        // Handle the result
        if (result.data) {
          if (result.data.clearScreen) {
            this.term.clear();
          } else if (result.data.command?.startsWith('mode ')) {
            // Handle mode change
            const newMode = result.data.command.split(' ')[1] as TerminalMode;
            if (['raw', 'content', 'source'].includes(newMode)) {
              this.formatter.setMode(newMode);
              this.writeSuccess('\n' + result.data.message + '\n');
            }
          } else if (result.data.type === 'error') {
            // Handle error messages
            const errorMessage = result.data.data?.content || result.data.data?.message || 'An error occurred';
            this.writeError(errorMessage + '\n');
          } else if (result.data.type === 'terminal') {
            // Handle terminal responses
            const content = result.data.data?.content || result.data.data?.message;
            const source = result.data.data?.source;
            if (content) {
              let formattedContent = content;
              if (this.formatter.getMode() === 'source' && source) {
                formattedContent = `[${source}] ${content}`;
              } else if (this.formatter.getMode() === 'raw') {
                formattedContent = JSON.stringify(result.data, null, 2);
              }
              this.writeMessage('\n' + formattedContent + '\n');
            }
          } else if (result.data.message) {
            result.success ? this.writeSuccess(result.data.message) : this.writeMessage(result.data.message);
          }
          this.onResponse?.(result);
        } else if (!result.success) {
          this.writeError(result.error || 'Unknown error occurred');
        }

      } catch (error) {
        const errorMessage = this.mode === 'prompt' 
          ? 'Prompt API is unreachable!' 
          : 'Command API is unreachable!';
        this.writeError(`${errorMessage} Cannot communicate with BrainsOS core.`);
      } finally {
        this._isExecuting = false;
      }
    }
    
    // Reset for next command
    this.commandBuffer.current = '';
    this.term.write(this.prompt);
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
    this.options = { ...this.options, ...newOptions };
    
    if (newOptions.welcomeMessage) {
      this.term.clear();
      this.writeWelcomeMessage();
    }
  }

  private startAutoConnection(): void {
    // Start connection status check interval
    this.connectionStatusInterval = setInterval(() => {
      const status = FrontendExecutor.getConnectionStatus();
      
      // Only notify parent component if status has changed
      if (status !== this.lastConnectionStatus) {
        this.lastConnectionStatus = status;
        console.log('TerminalManager: Status changed to', status);
        
        // Notify parent component of status change
        if (this.onResponse) {
          const response: ExecutionResult = {
            success: true,
            isLocalCommand: true,
            data: {
              type: 'connection-status',
              status
            }
          };
          this.onResponse(response);
        }

        // Refresh welcome message to update status
        this.writeWelcomeMessage();
      }
    }, 500); // Reduced interval for more responsive updates

    // Start automatic connection
    FrontendExecutor.autoConnect().catch(error => {
      console.error('TerminalManager: Connection error:', error);
      if (this.onResponse) {
        const response: ExecutionResult = {
          success: false,
          isLocalCommand: true,
          data: {
            type: 'connection-status',
            status: 'failed',
            error: error.message
          }
        };
        this.onResponse(response);
      }
      // Refresh welcome message to update status
      this.writeWelcomeMessage();
    });
  }

  public dispose(): void {
    if (this.connectionStatusInterval) {
      clearInterval(this.connectionStatusInterval);
    }
    this.term.dispose();
  }
} 