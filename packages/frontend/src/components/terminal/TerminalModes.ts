export type TerminalMode = 'raw' | 'content' | 'source';

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