import { MCPData, MCPDataDefinition, MCPResourceRegistry, ServiceSchema } from '../../handlers/api/mcp/mcpTypes';
import { dogNamesData } from './dogNames/dogNames';
import { randomFactsData } from './randomFacts/randomFacts';

/**
 * Registry for managing MCP resources
 * This keeps track of all available resources and their handlers
 */
export class ResourceRegistry implements MCPResourceRegistry<MCPData> {
  private resources: Map<string, MCPDataDefinition<MCPData>> = new Map();

  constructor() {
    // Register all resources
    this.registerResource(dogNamesData);
    this.registerResource(randomFactsData);
    // TODO: Auto-scan for other resources in the directory
  }

  // Required by Registry interface
  register(resource: MCPDataDefinition<MCPData>): void {
    this.registerResource(resource);
  }

  get(name: string): MCPDataDefinition<MCPData> | undefined {
    return this.getResource(name);
  }

  list(): MCPDataDefinition<MCPData>[] {
    return this.listResources();
  }

  getSchema(name: string): ServiceSchema | undefined {
    return this.getResourceSchema(name);
  }

  // Required by MCPResourceRegistry interface
  registerResource(resource: MCPDataDefinition<MCPData>): void {
    this.resources.set(resource.name, resource);
  }

  getResource(name: string): MCPDataDefinition<MCPData> | undefined {
    return this.resources.get(name);
  }

  listResources(): MCPDataDefinition<MCPData>[] {
    return Array.from(this.resources.values());
  }

  getResourceSchema(name: string): ServiceSchema | undefined {
    return this.resources.get(name)?.schema;
  }
}

// Create and export a singleton instance
export const resourceRegistry = new ResourceRegistry(); 