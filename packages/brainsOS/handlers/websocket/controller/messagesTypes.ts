/**
 * Standardized WebSocket message format for terminal communication
 */

export interface TerminalMessage {
  action: 'terminal';
  data: {
    rawData: string;
    requestStreaming: boolean;
    commandId: string;
    timestamp: string;
    source: 'terminal';
  };
}

export interface TerminalResponse {
  type: 'terminal' | 'error';
  data: {
    content: string;
    source: string;
    timestamp: string;
    commandId?: string;
  };
}

export interface TerminalError {
  type: 'error';
  data: {
    content: string;
    source: 'system';
    timestamp: string;
    commandId?: string;
  };
}

/**
 * Type guard to check if a message is a TerminalMessage
 */
export const isTerminalMessage = (message: any): message is TerminalMessage => {
  return (
    typeof message === 'object' &&
    message !== null &&
    (message.action === 'terminal' || message.type === 'default') &&
    typeof message.data === 'object' &&
    message.data !== null &&
    typeof message.data.rawData === 'string' &&
    typeof message.data.requestStreaming === 'boolean' &&
    typeof message.data.commandId === 'string' &&
    typeof message.data.timestamp === 'string' &&
    typeof message.data.source === 'string'
  );
};

/**
 * Type guard to check if a message is a TerminalResponse
 */
export function isTerminalResponse(message: any): message is TerminalResponse {
  return (
    message &&
    (message.type === 'terminal' || message.type === 'error') &&
    typeof message.data === 'object' &&
    typeof message.data.content === 'string' &&
    typeof message.data.source === 'string' &&
    typeof message.data.timestamp === 'string'
  );
}

/**
 * Type guard to check if a message is a TerminalError
 */
export function isTerminalError(message: any): message is TerminalError {
  return (
    message &&
    message.type === 'error' &&
    typeof message.data === 'object' &&
    typeof message.data.content === 'string' &&
    message.data.source === 'system' &&
    typeof message.data.timestamp === 'string'
  );
}
