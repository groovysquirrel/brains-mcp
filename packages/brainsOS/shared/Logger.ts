export type LogLevel = 'debug' | 'info' | 'warn' | 'error' | 'none';

export class Logger {
  private context: string;
  private static globalLogLevel: LogLevel;
  private instanceLogLevel?: LogLevel;

  constructor(context: string, level?: LogLevel) {
    this.context = context;
    this.instanceLogLevel = level;
    
    // Initialize global log level from environment variable if not already set
    if (!Logger.globalLogLevel) {
      Logger.globalLogLevel = (process.env.LOG_LEVEL || 'info').toLowerCase() as LogLevel;
      console.log(`[Logger] Setting global log level to: ${Logger.globalLogLevel}`);
    }
  }

  /**
   * Set the global log level for all loggers
   * 
   * @param level The log level to set
   */
  public static setLogLevel(level: LogLevel): void {
    Logger.globalLogLevel = level;
    console.log(`[Logger] Changed global log level to: ${level}`);
  }

  /**
   * Get the current global log level
   */
  public static getLogLevel(): LogLevel {
    return Logger.globalLogLevel;
  }

  /**
   * Set instance-specific log level
   * 
   * @param level The log level to set
   */
  public setLevel(level: LogLevel): void {
    this.instanceLogLevel = level;
  }

  /**
   * Get the effective log level for this logger instance
   */
  public getLevel(): LogLevel {
    // Instance level overrides global level if set
    return this.instanceLogLevel || Logger.globalLogLevel;
  }

  /**
   * Determine if a given level should be logged based on current settings
   */
  private shouldLog(level: LogLevel): boolean {
    const effectiveLogLevel = this.getLevel();
    if (effectiveLogLevel === 'none') return false;
    
    const levelPriority: Record<LogLevel, number> = {
      'debug': 0,
      'info': 1,
      'warn': 2,
      'error': 3,
      'none': 4
    };

    return levelPriority[level] >= levelPriority[effectiveLogLevel];
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