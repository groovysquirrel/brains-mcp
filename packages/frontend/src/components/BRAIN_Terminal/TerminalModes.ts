export type TerminalMode = 'raw' | 'content' | 'source';

/**
 * Interface for the parsed content from the brain's response,
 * often containing thoughts and a potential command.
 */
export interface BrainThoughtProcess {
  thoughts: {
    text?: string;
    reasoning?: string;
    plan?: string[];
    criticism?: string;
    speak?: string;
  } | null;
  command: {
    name: string;
    args: Record<string, any>;
  } | null;
}

export interface TerminalMessage {
  type: string;
  data: {
    source: string;
    content: string;
    timestamp: string;
    [key: string]: any;
  };
}

export class TerminalFormatter {
  private mode: TerminalMode = 'source';

  constructor(initialMode: TerminalMode = 'source') {
    this.mode = initialMode;
  }

  setMode(mode: TerminalMode) {
    this.mode = mode;
  }

  getMode(): TerminalMode {
    return this.mode;
  }

  formatMessage(message: TerminalMessage): string {
    switch (this.mode) {
      case 'raw':
        return JSON.stringify(message, null, 2);
      case 'content':
        return `${message.data.content}`;
      case 'source':
        return `[${message.data.source}] ${message.data.content}`;
      default:
        return JSON.stringify(message);
    }
  }
} 