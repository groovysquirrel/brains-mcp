import { MCPTool, MCPToolDefinition, MCPToolRegistry, ServiceSchema } from '../mcpTypes';
import { calculatorTool } from './calculator/calculator';
import { randomNumberTool } from './randomNumber/randomNumber';
import { tableConverterTool } from './tableConverter/tableConverter';

/**
 * Registry for managing MCP tools
 * This keeps track of all available tools and their handlers
 */
export class ToolsRegistry implements MCPToolRegistry<MCPTool> {
  private tools: Map<string, MCPToolDefinition<MCPTool>> = new Map();

  constructor() {
    // Register all tools
    this.registerTool(calculatorTool);
    this.registerTool(randomNumberTool);
    this.registerTool(tableConverterTool);
    // TODO: Auto-scan for other tools in the directory
  }

  // Required by Registry interface
  register(tool: MCPToolDefinition<MCPTool>): void {
    this.registerTool(tool);
  }

  get(name: string): MCPToolDefinition<MCPTool> | undefined {
    return this.getTool(name);
  }

  list(): MCPToolDefinition<MCPTool>[] {
    return this.listTools();
  }

  getSchema(name: string): ServiceSchema | undefined {
    return this.getToolSchema(name);
  }

  // Required by MCPToolRegistry interface
  registerTool(tool: MCPToolDefinition<MCPTool>): void {
    this.tools.set(tool.name, tool);
  }

  getTool(name: string): MCPToolDefinition<MCPTool> | undefined {
    return this.tools.get(name);
  }

  listTools(): MCPToolDefinition<MCPTool>[] {
    return Array.from(this.tools.values());
  }

  getToolSchema(name: string): ServiceSchema | undefined {
    return this.tools.get(name)?.schema;
  }
}

// Create and export a singleton instance
export const toolsRegistry = new ToolsRegistry(); 