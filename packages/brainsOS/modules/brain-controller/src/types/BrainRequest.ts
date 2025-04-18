import { BrainConfig } from './BrainConfig';

/**
 * BrainRequest defines the structure for requests to the brain controller
 */
export interface BrainRequest {
    /** The action to perform */
    action: 'brain/terminal/request' | 'brain/chat/request' | 'brain/list/request' | 'brain/get/request' | 'brain/mcp/request';
    
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
        (
            obj.action === 'brain/terminal/request' ||
            obj.action === 'brain/chat/request' ||
            obj.action === 'brain/list/request' ||
            obj.action === 'brain/get/request' ||
            obj.action === 'brain/mcp/request' ||
            // For backward compatibility
            obj.action === 'brain/terminal' ||
            obj.action === 'brain/chat' ||
            obj.action === 'brain/list' ||
            obj.action === 'brain/get' ||
            obj.action === 'brain/mcp'
        ) &&
        typeof obj.data === 'object' &&
        obj.data !== null
    );
} 