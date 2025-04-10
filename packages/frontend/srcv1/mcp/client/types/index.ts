// Client-specific types for UI components and state management
export interface MCPClientResource {
  id: string;
  name: string;
  type: 'function' | 'subprompt' | 'data' | 'component';
  content?: string;
  metadata?: Record<string, any>;
}

export interface MCPClientActivity {
  id: string;
  type: 'resource_added' | 'resource_removed' | 'resource_updated' | 'chat_message' | 'solution_update';
  status: 'pending' | 'completed' | 'failed';
  timestamp: number;
  details?: Record<string, any>;
}

export interface MCPClientState {
  activeResources: MCPClientResource[];
  activities: MCPClientActivity[];
  isConnected: boolean;
  error: string | null;
}

export interface MCPWorkspaceProps {
  controller: any; // We'll type this properly once we have the controller types
} 