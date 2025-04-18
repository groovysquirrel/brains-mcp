/**
 * Message types for brain controller WebSocket communications
 */

// -------------------------------------------------------------------------
// Request Message Types
// -------------------------------------------------------------------------

/**
 * Brain request message interface
 */
export interface BrainMessage {
    action: 'brain/terminal/request' | 'brain/chat/request' | 'brain/list/request' | 'brain/get/request' | 'brain/mcp/request';
    data: {
        rawData: string;
        requestStreaming: boolean;
        commandId: string;
        timestamp: string;
        source: 'terminal';
        brainName?: string;
        conversationId?: string;
        messages?: Array<{
            role: string;
            content: string;
        }>;
    };
}

/**
 * Legacy terminal message interface (for backward compatibility)
 */
export interface TerminalMessage {
    type: string;
    data: {
        rawData: string;
        requestStreaming: boolean;
        commandId: string;
        timestamp: string;
        source?: string;
        content?: string;
        [key: string]: any;
    };
}

// -------------------------------------------------------------------------
// Response Message Types
// -------------------------------------------------------------------------

/**
 * Response message types
 */
export type ResponseType = 'brain/terminal/response' | 'brain/terminal/error' | 'brain/terminal/status';

/**
 * Brain response interface
 */
export interface BrainResponse {
    type: ResponseType;
    data: {
        content?: string;
        source?: string;
        timestamp?: string;
        commandId?: string;
        brainName?: string;
        conversationId?: string;
        message?: string;
        metadata?: Record<string, any>;
        status?: 'queued' | 'processing' | 'completed' | 'failed';
    };
}

// -------------------------------------------------------------------------
// Type Guards
// -------------------------------------------------------------------------

/**
 * Type guard to check if a message is a BrainMessage
 */
export const isBrainMessage = (message: any): message is BrainMessage => {
    return (
        message &&
        typeof message.action === 'string' &&
        (
            message.action === 'brain/terminal/request' ||
            message.action === 'brain/chat/request' ||
            message.action === 'brain/list/request' ||
            message.action === 'brain/get/request' ||
            message.action === 'brain/mcp/request' ||
            // For backward compatibility
            message.action === 'brain/terminal' ||
            message.action === 'brain/chat' ||
            message.action === 'brain/list' ||
            message.action === 'brain/get' ||
            message.action === 'brain/mcp'
        ) &&
        typeof message.data === 'object' &&
        // Allow either rawData or messages to be provided
        (
            (typeof message.data.rawData === 'string') || 
            (Array.isArray(message.data.messages) && message.data.messages.length > 0)
        ) &&
        typeof message.data.requestStreaming === 'boolean' &&
        typeof message.data.commandId === 'string' &&
        typeof message.data.timestamp === 'string' &&
        message.data.source === 'terminal'
    );
};

/**
 * Type guard to check if a message is a TerminalMessage
 */
export const isTerminalMessage = (message: any): message is TerminalMessage => {
    return (
        message &&
        typeof message.type === 'string' &&
        typeof message.data === 'object' &&
        typeof message.data.rawData === 'string' &&
        typeof message.data.requestStreaming === 'boolean' &&
        typeof message.data.commandId === 'string' &&
        typeof message.data.timestamp === 'string'
    );
};

/**
 * Type guard to check if a message is a BrainResponse
 */
export const isBrainResponse = (message: any): message is BrainResponse => {
    return (
        message &&
        typeof message.type === 'string' &&
        (
            message.type === 'brain/terminal/response' ||
            message.type === 'brain/terminal/error' ||
            message.type === 'brain/terminal/status' ||
            // For backward compatibility
            message.type === 'terminal' ||
            message.type === 'error' ||
            message.type === 'processing'
        ) &&
        typeof message.data === 'object'
    );
}; 