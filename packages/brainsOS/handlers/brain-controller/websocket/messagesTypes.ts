/**
 * Extended message types for brain controller
 */
export interface BrainMessage {
    action: 'brain/chat' | 'brain/list' | 'brain/get';
    data: {
        rawData: string;
        requestStreaming: boolean;
        commandId: string;
        timestamp: string;
        source: 'terminal';
        brainName?: string;
        conversationId?: string;
    };
}

export interface BrainResponse {
    type: 'terminal' | 'error' | 'processing';
    data: {
        content?: string;
        source?: string;
        timestamp?: string;
        commandId?: string;
        brainName?: string;
        conversationId?: string;
        message?: string;
        metadata?: Record<string, any>;
    };
}

/**
 * Terminal message interface
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

/**
 * Type guard to check if a message is a BrainMessage
 */
export const isBrainMessage = (message: any): message is BrainMessage => {
    return (
        message &&
        typeof message.action === 'string' &&
        message.action.startsWith('brain/') &&
        typeof message.data === 'object' &&
        typeof message.data.rawData === 'string' &&
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
        (message.type === 'terminal' || message.type === 'error' || message.type === 'processing') &&
        typeof message.data === 'object'
    );
}; 