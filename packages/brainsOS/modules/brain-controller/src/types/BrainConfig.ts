/**
 * BrainConfig defines the structure for brain configurations
 * Each brain has a name and configuration details
 */
export interface BrainConfig {
    /** Unique identifier for the brain */
    name: string;
    
    /** Configuration details for the brain */
    config: {
        /** The model identifier (e.g. "claude-3-sonnet") */
        modelId: string;
        
        /** The provider name (e.g. "bedrock") */
        provider: string;
        
        /** A friendly name for the brain */
        nickname: string;
        
        /** The system prompt to use with this brain */
        systemPrompt: string;
        
        /** The persona description for this brain */
        persona: string;
    };
} 