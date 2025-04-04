import { LLMGateway } from '../llm-gateway/llmGateway';
import { conversationRepository } from '../system/repositories/conversation/conversationRepository';

interface MCPCommand {
    type: 'tool_call' | 'resource_access';
    name: string;
    params: Record<string, any>;
}

interface MCPResponse {
    result?: any;
    error?: string;
    command?: MCPCommand;
}

export class ModelController {
    private llmGateway: LLMGateway;
    private conversationRepo: typeof conversationRepository;

    constructor(
        llmGateway: LLMGateway,
        conversationRepo: typeof conversationRepository
    ) {
        this.llmGateway = llmGateway;
        this.conversationRepo = conversationRepo;
    }

    /**
     * Process a message from a WebSocket connection
     */
    async processMessage(connectionId: string, message: string): Promise<string> {
        try {
            // Store message in conversation history
            await this.conversationRepo.addMessage({
                connectionId,
                content: message,
                role: 'user',
                timestamp: Date.now()
            });

            // Get LLM response
            const llmResponse = await this.llmGateway.chat({
                messages: [{
                    role: 'user',
                    content: message
                }],
                conversation: await this.conversationRepo.getConversation(connectionId)
            });

            // Process any MCP commands in the response
            const mcpCommands = this.extractMCPCommands(llmResponse);
            const mcpResults = await this.executeMCPCommands(mcpCommands);

            // Generate final response incorporating MCP results
            const finalResponse = await this.generateFinalResponse(llmResponse, mcpResults);

            // Store response in conversation history
            await this.conversationRepo.addMessage({
                connectionId,
                content: finalResponse,
                role: 'assistant',
                timestamp: Date.now()
            });

            return finalResponse;

        } catch (error) {
            console.error('Error processing message:', error);
            throw error;
        }
    }

    /**
     * Extracts MCP commands from LLM response
     */
    private extractMCPCommands(llmResponse: string): MCPCommand[] {
        // Parse response for MCP command blocks
        const mcpMatch = llmResponse.match(/<mcp>(.*?)<\/mcp>/s);
        if (!mcpMatch) return [];

        try {
            const mcpBlock = JSON.parse(mcpMatch[1]);
            return mcpBlock.commands || [];
        } catch (error) {
            console.error('Error parsing MCP commands:', error);
            return [];
        }
    }

    /**
     * Executes MCP commands and returns results
     */
    private async executeMCPCommands(commands: MCPCommand[]): Promise<MCPResponse[]> {
        const results: MCPResponse[] = [];

        for (const command of commands) {
            try {
                // Call MCP Server API
                const response = await fetch('/api/mcp', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(command)
                });

                const result = await response.json();
                results.push(result);
            } catch (error) {
                console.error('Error executing MCP command:', error);
                results.push({
                    error: 'Failed to execute MCP command',
                    command
                });
            }
        }

        return results;
    }

    /**
     * Generates final response incorporating MCP results
     */
    private async generateFinalResponse(
        llmResponse: string,
        mcpResults: MCPResponse[]
    ): Promise<string> {
        // If no MCP results, return original response
        if (mcpResults.length === 0) {
            return llmResponse.replace(/<mcp>.*?<\/mcp>/s, '').trim();
        }

        // Get LLM to incorporate MCP results into response
        const finalResponse = await this.llmGateway.chat({
            messages: [{
                role: 'system',
                content: 'Given these MCP results, update your response:'
            }, {
                role: 'user',
                content: JSON.stringify({
                    originalResponse: llmResponse,
                    mcpResults
                })
            }]
        });

        return finalResponse;
    }
} 