/**
 * Logger class for the brain controller module
 */
export class Logger {
    private name: string;

    constructor(name: string) {
        this.name = name;
    }

    /**
     * Log an info message
     */
    public info(message: string, metadata?: Record<string, any>): void {
        console.log(`[${this.name}] INFO: ${message}`, metadata || '');
    }

    /**
     * Log an error message
     */
    public error(message: string, error?: any): void {
        console.error(`[${this.name}] ERROR: ${message}`, error || '');
    }

    /**
     * Log a warning message
     */
    public warn(message: string, metadata?: Record<string, any>): void {
        console.warn(`[${this.name}] WARN: ${message}`, metadata || '');
    }

    /**
     * Log a debug message
     */
    public debug(message: string, metadata?: Record<string, any>): void {
        console.debug(`[${this.name}] DEBUG: ${message}`, metadata || '');
    }
} 