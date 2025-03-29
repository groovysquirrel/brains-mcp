import { MCPRegistry, MCPData, MCPDataDefinition, MCPToolDefinition, MCPToolSchema } from '../mcpTypes';
import { dogNamesData } from './dogNames/dogNames';

export class ResourcesRegistry implements MCPRegistry<MCPData> {
  private resources: Map<string, MCPDataDefinition<MCPData>> = new Map();

  constructor() {
    // Register all data providers
    this.registerResource(dogNamesData);
    // TODO: Auto-scan for other resources in the directory
  }

  // Required by MCPRegistry interface but not used for resources
  registerTool(tool: MCPToolDefinition<MCPData>): void {
    throw new Error('Use registerResource for data providers');
  }

  getTool(name: string): MCPToolDefinition<MCPData> | undefined {
    throw new Error('Use getResource for data providers');
  }

  listTools(): MCPToolDefinition<MCPData>[] {
    throw new Error('Use listResources for data providers');
  }

  getToolSchema(name: string): MCPToolSchema | undefined {
    throw new Error('Use getResourceSchema for data providers');
  }

  // Resource-specific methods
  registerResource(resource: MCPDataDefinition<MCPData>): void {
    this.resources.set(resource.name, resource);
  }

  getResource(name: string): MCPDataDefinition<MCPData> | undefined {
    return this.resources.get(name);
  }

  listResources(): MCPDataDefinition<MCPData>[] {
    return Array.from(this.resources.values());
  }

  getResourceSchema(name: string): MCPDataDefinition<MCPData>['schema'] | undefined {
    return this.resources.get(name)?.schema;
  }
}

// Create and export a singleton instance
export const resourcesRegistry = new ResourcesRegistry(); 