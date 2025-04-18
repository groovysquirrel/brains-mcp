// MCP related types
export interface MCPTool {
    name: string;
    description: string;
    schema: {
        type: string;
        function: {
            name: string;
            description: string;
            parameters: {
                type: string;
                properties: Record<string, any>;
                required?: string[];
            };
        };
    };
}

export interface MCPToolRequest {
    requestType: 'tool';
    requestId: string;
    toolName: string;
    parameters: Record<string, any>;
}

/**
 * MCP related types for different resource categories
 */
export interface MCPTransformer {
    name: string;
    description: string;
    schema: {
        type: string;
        objectType: string;
        views: string[];
    };
}

export interface MCPPrompt {
    name: string;
    description: string;
    templateText: string;
    parameters?: Record<string, any>;
}

export interface MCPResource {
    name: string;
    description: string;
    type: string;
    data: any;
}
