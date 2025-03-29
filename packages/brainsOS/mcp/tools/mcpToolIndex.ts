import { MCPRegistry, MCPTool, MCPToolDefinition } from '../mcpTypes';
import { calculatorTool } from './calculator/calculator';
import { randomNumberTool } from './randomNumber/randomNumber';
import { tableConverterTool } from './tableConverter/tableConverter';

export class ToolsRegistry implements MCPRegistry<MCPTool> {
  private tools: Map<string, MCPToolDefinition<MCPTool>> = new Map();

  constructor() {
    // Register all tools
    this.registerTool(calculatorTool);
    this.registerTool(randomNumberTool);
    this.registerTool(tableConverterTool);
    // TODO: Auto-scan for other tools in the directory
  }

  registerTool(tool: MCPToolDefinition<MCPTool>): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): MCPToolDefinition<MCPTool> | undefined {
    return this.tools.get(name);
  }

  listTools(): MCPToolDefinition<MCPTool>[] {
    return Array.from(this.tools.values());
  }

  getToolSchema(name: string): MCPToolDefinition<MCPTool>['schema'] | undefined {
    return this.tools.get(name)?.schema;
  }
}

// Create and export a singleton instance
export const toolsRegistry = new ToolsRegistry(); 