import { BrainConfig } from './BrainConfig';

/**
 * BrainRequest defines the structure for requests to the brain controller
 */
export interface BrainRequest {
    /** The action to perform */
    action: string;
    
    /** The request data */
    data: {
        /** Optional provider override */
        provider?: string;
        
        /** Optional model ID override */
        modelId?: string;
        
        /** Optional conversation ID for tracking */
        conversationId?: string;
        
        /** Messages for the conversation */
        messages?: Array<{
            role: string;
            content: string;
        }>;
        
        /** Additional request-specific data */
        [key: string]: any;
    };
}

/**
 * Validates if an object is a BrainRequest
 * @param obj The object to validate
 * @returns true if the object is a valid BrainRequest
 */
export function isBrainRequest(obj: any): obj is BrainRequest {
    return (
        typeof obj === 'object' &&
        obj !== null &&
        typeof obj.action === 'string' &&
        typeof obj.data === 'object' &&
        obj.data !== null
    );
} 