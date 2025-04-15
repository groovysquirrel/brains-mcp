export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export class Logger {
  private context: string;
  private static logLevel: LogLevel;

  constructor(context: string) {
    this.context = context;
    
    // Initialize log level from environment variable if not already set
    if (!Logger.logLevel) {
      Logger.logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
      console.log(`[Logger] Setting log level to: ${Logger.logLevel}`);
    }
  }

  /**
   * Set the global log level for all loggers
   * 
   * @param level The log level to set
   */
  public static setLogLevel(level: LogLevel): void {
    Logger.logLevel = level;
    console.log(`[Logger] Changed log level to: ${level}`);
  }

  /**
   * Get the current log level
   */
  public static getLogLevel(): LogLevel {
    return Logger.logLevel;
  }

  /**
   * Determine if a given level should be logged based on current settings
   */
  private shouldLog(level: LogLevel): boolean {
    if (Logger.logLevel === 'none') return false;
    
    const levelPriority: Record<LogLevel, number> = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3,
      'none': 4
    };

    return levelPriority[level] >= levelPriority[Logger.logLevel];
  }

  info(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('info')) return;
    console.log(`[${this.context}] ${message}`, metadata || '');
  }

  warn(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('warn')) return;
    console.warn(`[${this.context}] ${message}`, metadata || '');
  }

  error(message: string, metadata?: Record<string, unknown>): void {
    if (!this.shouldLog('error')) return;
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
    if (!this.shouldLog('debug')) return;
    console.debug(`[${this.context}] ${message}`, metadata || '');
  }
} 