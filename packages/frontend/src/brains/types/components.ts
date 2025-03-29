/**
 * Component Types
 * 
 * Types for React component props and state.
 */

import { 
  NodeProps, 
  Edge, 
  Node,
  NodeChange, 
  EdgeChange, 
  Connection, 
  Viewport,
  EdgeProps 
} from 'reactflow';
import { FlowData, FlowVersion, BaseNodeData, PromptNodeData, NodeType } from './flow';
import { LLM } from './models';
import { NodeExecutionResult } from './execution';

/**
 * Flow Menu Props
 */
export interface FlowMenuProps {
  selectedFlow: string;
  selectedVersion: string;
  versions: FlowVersion[];
  onSave: () => Promise<{ success: boolean; error?: string }>;
  onSaveAs: (newName: string) => Promise<{ success: boolean; error?: string }>;
  onRename: (newName: string) => Promise<{ success: boolean; error?: string }>;
  onVersionChange: (version: string) => void;
  onFlowSelect: (flowName: string, version: string) => Promise<void>;
  onNew: () => void;
}

/**
 * Flow Canvas Props
 */
export interface FlowCanvasProps {
  nodes: Node[];
  edges: Edge[];
  nodeTypes: {
    input: React.ComponentType<NodeProps<BaseNodeData>>;
    prompt: React.ComponentType<NodeProps<PromptNodeProps>>;
    output: React.ComponentType<NodeProps<BaseNodeData>>;
    data: React.ComponentType<NodeProps<BaseNodeData>>;
  };
  onNodesChange: (changes: NodeChange[]) => void;
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  onViewportChange: (viewport: Viewport) => void;
  onNodeUpdate: (id: string, updates: Partial<BaseNodeData>) => void;
  onNodeRemove: (id: string) => void;
  onEdgeDelete: (edgeId: string) => void;
}

/**
 * Prompt Node Props
 */
export interface PromptNodeProps extends PromptNodeData {
  models?: LLM[];
  isLoadingModels?: boolean;
  onSystemPromptChange?: (prompt: string) => void;
  onModelChange?: (modelId: string) => void;
  onExecute?: (nodeId: string, content: string) => void;
}

/**
 * Custom Edge Props
 */
export interface CustomEdgeProps extends EdgeProps {
  data?: any;
  onDelete?: (edgeId: string) => void;
  selected?: boolean;
}

/**
 * Core Node Props Interface
 * Base props for all node components
 */
export interface CoreNodeProps {
  id: string;
  type: NodeType;
  data: BaseNodeData;
  selected: boolean;
  onUpdate: (nodeId: string, updates: Partial<BaseNodeData>) => void;
  onRemove: (nodeId: string) => void;
  headerActions?: React.ReactNode;
  children?: React.ReactNode;
}

/**
 * Flow Editor Types
 */
export interface FlowEditorHandle {
  // Core state access
  getCurrentState: () => FlowData;
  
  // State management
  setEditorState: (state: FlowData) => void;
  clearState: () => void;
  
  // History operations
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  updateNodeExecutionState: (nodeId: string, result: NodeExecutionResult) => void;
  
  // Reset operations
  resetNodesState: () => void;
}

/**
 * Flow Editor Props
 */
export interface FlowEditorProps {
  initialState?: FlowData;
  readOnly?: boolean;
  onStateChange?: (state: FlowData) => void;
  onError?: (error: Error) => void;
  errorFallback?: React.ReactNode;
  onNodeUpdate?: (nodeId: string, updates: Partial<BaseNodeData>) => void;
  onNodeRemove?: (nodeId: string) => void;
  onEdgeDelete?: (edgeId: string) => void;
  onNodeExecutionRequest?: (nodeId: string, input?: string) => void;
  onExecutionComplete?: (nodeId: string, result: NodeExecutionResult) => void;
  onExecutionError?: (nodeId: string, error: Error) => void;
} 