/**
 * BrainResponse defines the structure for responses from the brain controller
 */
export interface BrainResponse {
    /** The type of response */
    type: 'terminal' | 'error' | 'processing';
    
    /** The response data */
    data: {
        /** The content of the response (for terminal type) */
        content?: string;
        
        /** The source of the response */
        source?: string;
        
        /** The timestamp of the response */
        timestamp?: string;
        
        /** The command ID associated with the response */
        commandId?: string;
        
        /** The error message (for error type) */
        message?: string;
        
        /** Additional response metadata */
        metadata?: Record<string, any>;
    };
}

/**
 * Creates a terminal response
 * @param content The response content
 * @param source The response source
 * @param commandId Optional command ID
 * @returns A BrainResponse of type 'terminal'
 */
export function createTerminalResponse(
    content: string,
    source: string,
    commandId?: string
): BrainResponse {
    return {
        type: 'terminal',
        data: {
            content,
            source,
            timestamp: new Date().toISOString(),
            commandId
        }
    };
}

/**
 * Creates an error response
 * @param message The error message
 * @param source The error source
 * @returns A BrainResponse of type 'error'
 */
export function createErrorResponse(
    message: string,
    source: string = 'system'
): BrainResponse {
    return {
        type: 'error',
        data: {
            message,
            source,
            timestamp: new Date().toISOString()
        }
    };
}

/**
 * Creates a processing response
 * @returns A BrainResponse of type 'processing'
 */
export function createProcessingResponse(): BrainResponse {
    return {
        type: 'processing',
        data: {
            timestamp: new Date().toISOString()
        }
    };
} 