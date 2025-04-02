import { CommandRequest} from '../_core/registry/commandRegistry';

// Define specific request types for each showable object
export interface ShowSystemRequest extends CommandRequest {
    action: 'show';
    object: 'system';
    parameters: string[];
    flags: {
        json?: boolean;
        format?: 'compact' | 'full';
        [key: string]: string | boolean | undefined;
    };
}

export interface ShowModelRequest extends CommandRequest {
    action: 'show';
    object: 'model';
    parameters: string[];
    flags: {
        json?: boolean;
        version?: string;
        [key: string]: string | boolean | undefined;
    };
}

export interface ShowLLMRequest extends CommandRequest {
    action: 'show';
    object: 'llm';
    parameters: string[];
    flags: {
        json?: boolean;
        version?: string;
        detail?: boolean;
        [key: string]: string | boolean | undefined;
    };
}

// Combine all show command types
export type ShowCommandRequest = 
    | ShowSystemRequest 
    | ShowModelRequest
    | ShowLLMRequest;
