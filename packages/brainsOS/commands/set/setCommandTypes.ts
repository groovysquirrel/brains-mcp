import { CommandRequest } from '../_core/registry/commandRegistry';

// Define specific request types for each settable object
export interface SetModelRequest extends CommandRequest {
    action: 'set';
    object: 'model';
    parameters: [string]; // Model name
    flags: Record<string, string | boolean>;
}

export interface SetFormatRequest extends CommandRequest {
    action: 'set';
    object: 'format';
    parameters: ['json' | 'table' | 'text'];
    flags: Record<string, string | boolean>;
}

export interface SetSystemRequest extends CommandRequest {
    action: 'set';
    object: 'system';
    parameters: [string]; // key=value format
    flags: Record<string, string | boolean>;
}

// Combine all set command types
export type SetCommandRequest = 
    | SetModelRequest 
    | SetFormatRequest 
    | SetSystemRequest;