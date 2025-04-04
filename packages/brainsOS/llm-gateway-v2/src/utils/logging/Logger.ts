export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    console.log(`[${this.context}] ${message}`, metadata || '');
  }

  error(message: string, error?: Error | unknown): void {
    console.error(`[${this.context}] ${message}`, error || '');
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    console.debug(`[${this.context}] ${message}`, metadata || '');
  }
} 