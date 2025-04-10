import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { FrontendExecutor } from './FrontendExecutor';

interface TerminalOptions {
  welcomeMessage?: string;
  prompt?: string;
  mode?: 'command' | 'prompt';
}

interface TerminalManagerOptions extends TerminalOptions {
  onResponse?: (response: any) => void;
}

export class TerminalManager {
  private term: Terminal;
  private fitAddon: FitAddon;
  private commandBuffer = {
    current: '',
    history: [] as string[],
    historyIndex: -1
  };

  private readonly prompt: string;
  private readonly mode: 'command' | 'prompt';
  private readonly onResponse?: (response: any) => void;
  private _isExecuting = false;

  constructor(container: HTMLElement, options?: TerminalManagerOptions) {
    this.prompt = options?.prompt || '> ';
    this.mode = options?.mode || 'command';
    this.onResponse = options?.onResponse;
    
    this.term = new Terminal({
      cursorBlink: true,
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
      },
      fontSize: 14,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
    });

    this.fitAddon = new FitAddon();
    this.term.loadAddon(this.fitAddon);

    this.term.open(container);
    
    const performFit = () => {
      try {
        this.fitAddon.fit();
        this.term.refresh(0, this.term.rows - 1);
      } catch (e) {
        console.warn('Failed to fit terminal:', e);
      }
    };

    setTimeout(performFit, 0);

    window.addEventListener('resize', () => {
      requestAnimationFrame(performFit);
    });

    this.setupEventListeners();
    this.writeWelcomeMessage(options?.welcomeMessage);
  }

  private setupEventListeners() {
    this.term.onData(data => {
      // Special key sequences from xterm
      if (data === '\u001b[A') {  // Up arrow
        this.navigateHistory('up');
        return;
      }
      if (data === '\u001b[B') {  // Down arrow
        this.navigateHistory('down');
        return;
      }
      if (data === '\r') {  // Enter
        this.handleEnterKey();
        return;
      }
      if (data === '\u007f') {  // Backspace
        if (this.commandBuffer.current.length > 0) {
          this.commandBuffer.current = this.commandBuffer.current.slice(0, -1);
          this.term.write('\b \b');
        }
        return;
      }

      // Regular input (including paste)
      const cleanData = data.replace(/[\r\n]/g, '');
      this.commandBuffer.current += cleanData;
      this.term.write(cleanData);
    });
  }

  private async handleEnterKey() {
    this.term.write('\r\n');
    const input = this.commandBuffer.current.trim();
    
    if (input) {
      this.commandBuffer.history.push(input);
      this.commandBuffer.historyIndex = this.commandBuffer.history.length;
      
      try {
        if (this._isExecuting) return;
        this._isExecuting = true;

        const result = await FrontendExecutor.execute(input, this.mode);
        
        if (result.data) {
          if (result.data.clearScreen) {
            this.term.clear();
          } else if (result.data.message) {
            this.writeMessage(result.data.message);
          }
          if (this.onResponse) {
            this.onResponse(result);
          }
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
    
    this.commandBuffer.current = '';
    this.term.write(this.prompt);
  }

  private navigateHistory(direction: 'up' | 'down') {
    if (direction === 'up' && this.commandBuffer.historyIndex > 0) {
      this.commandBuffer.historyIndex--;
      const historyEntry = this.commandBuffer.history[this.commandBuffer.historyIndex];
      this.setCurrentLine(historyEntry);
    } else if (direction === 'down') {
      if (this.commandBuffer.historyIndex < this.commandBuffer.history.length - 1) {
        this.commandBuffer.historyIndex++;
        const historyEntry = this.commandBuffer.history[this.commandBuffer.historyIndex];
        this.setCurrentLine(historyEntry);
      } else {
        // Clear line when pressing down at the end of history
        this.commandBuffer.historyIndex = this.commandBuffer.history.length;
        this.setCurrentLine('');
      }
    }
  }

  private setCurrentLine(newLine: string) {
    // Clear current line
    this.term.write('\r' + this.prompt + ' '.repeat(this.commandBuffer.current.length) + '\r' + this.prompt);
    
    // Write new line
    this.commandBuffer.current = newLine;
    this.term.write(newLine);
  }

  private writeWelcomeMessage(welcomeMessage?: string) {
    const version = "0.1.0"; // Use environment variable in production
    const consoleTitle = `BRAINS OS v${version}`;
    
    if (welcomeMessage) {
      this.term.writeln(consoleTitle);
      this.term.writeln('*'.repeat(consoleTitle.length));
      this.term.writeln(welcomeMessage);
    } else {
      this.term.writeln(consoleTitle);
      this.term.writeln('*'.repeat(consoleTitle.length));
      this.term.writeln("Default BrainsOS Operating Console\n");
    }
    this.term.writeln('');
    this.term.write(this.prompt);
  }

  private writeMessage(message: string) {
    message.split('\n').forEach(line => {
      this.term.writeln(`  ${line}`);
    });
  }

  private writeError(error: string) {
    error.split('\n').forEach(line => {
      this.term.writeln(` !!! Error: ${line}`);
    });
  }

  public fit() {
    requestAnimationFrame(() => {
      try {
        this.fitAddon.fit();
        this.term.refresh(0, this.term.rows - 1);
      } catch (e) {
        console.warn('Failed to fit terminal:', e);
      }
    });
  }
} 