import { MCPErrorResponse } from './MCPError';

export interface MCPResource {
  id: string;
  name: string;
  type: string;
  content: any;
  metadata: Record<string, any>;
}

export interface MCPResourceResponse {
  success: true;
  data: MCPResource;
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
}

export type MCPResourceResult = MCPResourceResponse | MCPErrorResponse;

export interface MCPResourceRequest {
  requestType: 'resource';
  requestId: string;
  resourceId: string;
  action: 'get' | 'create' | 'update' | 'delete';
  parameters?: Record<string, any>;
}

export interface MCPResourceRegistry {
  registerResource(resource: MCPResource): void;
  getResource(id: string): MCPResource | undefined;
  listResources(): MCPResource[];
} 