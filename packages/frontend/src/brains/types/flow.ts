/**
 * Core Flow Types
 * 
 * These types define the fundamental structure of nodes and edges in the flow system,
 * independent of any visualization library.
 */

import { Position, Dimensions, NodeStatus } from './common';
import { ExecutionError } from './execution';
import { Node, Edge, Viewport } from 'reactflow';
import { LLM } from './models';

/**
 * Core node types supported by the system
 */
export type NodeType = 'input' | 'prompt' | 'output' | 'data';

/**
 * Base interface for all node data
 */
export interface BaseNodeData {
  id: string;
  type: NodeType;
  position: Position;
  dimensions: Dimensions;
  status: NodeStatus;
  error?: ExecutionError;
  metadata?: Record<string, any>;
  collapsed: boolean;
  selected: boolean;
  handles: {
    input?: HandleConfig[];
    output?: HandleConfig[];
  };
  content?: unknown;
  label: string;
  isCollapsed: boolean;
  modelId?: string;
  systemPrompt?: string;
  onUpdate: (nodeId: string, updates: Partial<BaseNodeData>) => void;
  onRemove: (nodeId: string) => void;
  onCollapse?: () => void;
  onDelete?: () => void;
  onNameChange?: (newName: string) => Promise<{ success: boolean; error?: string }>;
  onExecute?: (nodeId: string, content: string) => void;
  onResizeStart?: (nodeId: string) => void;
  onResizeEnd?: (nodeId: string) => void;
}

/**
 * Node-specific data interfaces
 */
export interface InputNodeData extends BaseNodeData {
  type: 'input';
  content: string;
  onContentChange?: (content: string) => void;
  onExecute?: (nodeId: string, content: string) => void;
}

export interface PromptNodeData extends BaseNodeData {
  type: 'prompt';
  content: string;
  modelId?: string;
  systemPrompt?: string;
  status: NodeStatus;
  models?: LLM[];
  isLoadingModels?: boolean;
  lastRunStats?: {
    tokens: {
      prompt: number;
      completion: number;
      total: number;
    };
    processingTime: number;
  };
  onSystemPromptChange?: (prompt: string) => void;
  onModelChange?: (modelId: string) => void;
  onExecute?: (nodeId: string, content: string) => void;
}

export interface OutputNodeData extends BaseNodeData {
  type: 'output';
  content: string;
}

export interface DataNodeData extends BaseNodeData {
  type: 'data';
  content: string;
  format?: string;
}

/**
 * Handle configuration for node connections
 */
export interface HandleConfig {
  id: string;
  type: 'source' | 'target';
  position: 'top' | 'right' | 'bottom' | 'left';
}

/**
 * Core flow node interface - extends ReactFlow's Node type
 */
export type FlowNode = Node<BaseNodeData>;

/**
 * Core flow edge interface - extends ReactFlow's Edge type
 */
export type FlowEdge = Edge;

/**
 * Complete flow data structure
 */
export interface FlowData {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport?: {
    x: number;
    y: number;
    zoom: number;
  };
}

/**
 * Flow version information
 */
export interface FlowVersion {
  version: string;
  displayName: string;
  createdAt?: string;
}

/**
 * Flow metadata
 */
export interface FlowMetadata {
  id: string;
  name: string;
  versions: FlowVersion[];
  createdAt: string;
  updatedAt: string;
}



/**
 * Flow state for history management
 */
export interface FlowState {
  nodes: FlowNode[];
  edges: FlowEdge[];
  viewport: Viewport;
} 