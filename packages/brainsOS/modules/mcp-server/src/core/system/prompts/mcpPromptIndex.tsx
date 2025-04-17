import { MCPPromptRegistry, MCPPrompt, MCPToolDefinition } from '../../handlers/api/mcp/mcpTypes';
import { oneSentencePrompt } from './oneSentence/oneSentence';

export class PromptRegistry implements MCPPromptRegistry<MCPPrompt> {
  private prompts: Map<string, MCPToolDefinition<MCPPrompt>> = new Map();

  constructor() {
    // Register all prompts
    this.registerPrompt(oneSentencePrompt);
    // TODO: Auto-scan for other prompts in the directory
  }

  registerPrompt(prompt: MCPToolDefinition<MCPPrompt>): void {
    this.prompts.set(prompt.name, prompt);
  }

  getPrompt(name: string): MCPToolDefinition<MCPPrompt> | undefined {
    return this.prompts.get(name);
  }

  listPrompts(): MCPToolDefinition<MCPPrompt>[] {
    return Array.from(this.prompts.values());
  }

  getPromptSchema(name: string): MCPToolDefinition<MCPPrompt>['schema'] | undefined {
    return this.prompts.get(name)?.schema;
  }
}

// Create and export a singleton instance
export const promptRegistry = new PromptRegistry(); 