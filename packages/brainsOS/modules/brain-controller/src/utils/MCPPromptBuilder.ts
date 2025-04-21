import { Logger } from '../../../../shared/Logger';
import { MCPTool, MCPTransformer, MCPPrompt, MCPResource } from '../types/MCPRequests';

/**
 * Utility class for building MCP prompts and documentation
 * This separates prompt generation logic from the BrainController
 */
export class MCPPromptBuilder {
    private logger: Logger;

    constructor() {
        this.logger = new Logger('BRAIN - MCPPromptBuilder', 'warn');
    }

    /**
     * Generate comprehensive documentation for all available MCP components
     * 
     * This method creates detailed documentation for all available MCP components:
     * - Tools: Available commands that can be executed
     * - Transformers: Data conversion utilities
     * - Prompts: Pre-defined prompt templates
     * - Resources: Static data resources
     * 
     * The documentation is formatted in markdown and can be appended to the system prompt.
     * 
     * @param tools - Available MCP tools
     * @param transformers - Available MCP transformers
     * @param prompts - Available MCP prompts
     * @param resources - Available MCP resources
     * @returns Formatted markdown documentation of all MCP components
     */
    public generateMCPDocumentation(
        tools: MCPTool[],
        transformers: MCPTransformer[],
        prompts: MCPPrompt[],
        resources: MCPResource[]
    ): string {
        // Start with an empty documentation string
        let documentation = '\n\n## MCP Components\n\n';
        
        // Add Tools documentation
        if (tools && tools.length > 0) {
            documentation += '### Available Commands\n\n';
            documentation += 'To use a command, include it in your response like this:\n\n';
            documentation += '```json\n';
            documentation += '{\n';
            documentation += '  "thoughts": { ... },\n';
            documentation += '  "command": {\n';
            documentation += '    "name": "command_name",\n';
            documentation += '    "args": { "param1": "value1" }\n';
            documentation += '  }\n';
            documentation += '}\n';
            documentation += '```\n\n';
            documentation += 'Available commands:\n\n';
            
            for (const tool of tools) {
                documentation += `#### ${tool.name}\n`;
                documentation += `${tool.description}\n\n`;
                documentation += '**Parameters:**\n\n';
                documentation += '```json\n';
                documentation += JSON.stringify(tool.schema, null, 2);
                documentation += '\n```\n\n';
            }
        }
        
        // Add Transformers documentation
        if (transformers && transformers.length > 0) {
            documentation += '### Available Transformers\n\n';
            documentation += 'Transformers convert data between different formats.\n\n';
            
            for (const transformer of transformers) {
                documentation += `#### ${transformer.name}\n`;
                documentation += `${transformer.description}\n\n`;
                documentation += `**Object Type:** ${transformer.schema.objectType}\n`;
                documentation += `**Views:** ${transformer.schema.views.join(' → ')}\n\n`;
            }
        }
        
        // Add Prompts documentation
        if (prompts && prompts.length > 0) {
            documentation += '### Available Prompts\n\n';
            documentation += 'Pre-defined prompt templates you can reference.\n\n';
            
            for (const prompt of prompts) {
                documentation += `#### ${prompt.name}\n`;
                documentation += `${prompt.description}\n\n`;
                
                if (prompt.parameters) {
                    documentation += '**Parameters:**\n\n';
                    documentation += '```json\n';
                    documentation += JSON.stringify(prompt.parameters, null, 2);
                    documentation += '\n```\n\n';
                }
            }
        }
        
        // Add Resources documentation
        if (resources && resources.length > 0) {
            documentation += '### Available Resources\n\n';
            documentation += 'Static data resources you can reference.\n\n';
            
            for (const resource of resources) {
                documentation += `#### ${resource.name}\n`;
                documentation += `${resource.description}\n\n`;
                documentation += `**Type:** ${resource.type}\n\n`;
            }
        }
        
        this.logger.info('Generated MCP documentation', {
            documentationLength: documentation.length,
            toolCount: tools.length,
            transformerCount: transformers.length,
            promptCount: prompts.length, 
            resourceCount: resources.length
        });
        
        return documentation;
    }

    /**
     * Format the complete system prompt for the LLM
     * 
     * @param nickname - The brain's nickname
     * @param persona - The brain's persona description
     * @param systemPrompt - The base system prompt
     * @param mcpPrompt - The MCP instructions prompt
     * @param mcpDocumentation - The generated MCP documentation
     * @returns The formatted system prompt
     */
    public formatSystemPrompt(
        nickname: string,
        persona: string,
        systemPrompt: string,
        mcpPrompt: string,
        mcpDocumentation: string
    ): string {
        return `Your name and nickname is ${nickname}.

PERSONA: ${persona}

${systemPrompt}

${mcpPrompt}${mcpDocumentation}`;
    }
} 