export class Logger {
  private context: string;

  constructor(context: string) {
    this.context = context;
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    console.log(`[${this.context}] ${message}`, metadata || '');
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    console.warn(`[${this.context}] ${message}`, metadata || '');
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    if (metadata && metadata.error) {
      const error = metadata.error as Error;
      console.error(`[${this.context}] ${message}`, {
        ...metadata,
        error: {
          name: error.name,
          message: error.message,
          stack: error.stack
        }
      });
    } else {
      console.error(`[${this.context}] ${message}`, metadata || '');
    }
  }

  debug(message: string, metadata?: Record<string, unknown>): void {
    console.debug(`[${this.context}] ${message}`, metadata || '');
  }
} 