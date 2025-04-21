type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Define log level hierarchy for comparison
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  'debug': 0,
  'info': 1,
  'warn': 2,
  'error': 3
};

export class Logger {
  private level: LogLevel;

  constructor(private context: string, level: LogLevel = 'debug') {
    this.level = level;
  }

  // Check if a message at the given level should be logged
  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.level];
  }

  // Set the log level
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  // Get the current log level
  getLevel(): LogLevel {
    return this.level;
  }

  private log(level: LogLevel, message: string, ...args: any[]) {
    if (!this.shouldLog(level)) return;
    
    const timestamp = new Date().toISOString();
    console[level](`[${timestamp}] [${this.context}] ${message}`, ...args);
  }

  debug(message: string, ...args: any[]) {
    this.log('debug', message, ...args);
  }

  info(message: string, ...args: any[]) {
    this.log('info', message, ...args);
  }

  warn(message: string, ...args: any[]) {
    this.log('warn', message, ...args);
  }

  error(message: string, ...args: any[]) {
    this.log('error', message, ...args);
  }
}