import { BaseVersionedObject } from '../base/versionedRepository';
import { StoredItem } from '../../services/storage/storageTypes';

// Interface for flows as they are stored in the database
export interface StoredFlow extends BaseVersionedObject {
  content: {
    nodes: FlowNode[];
    edges: FlowEdge[];
    viewport: Viewport;
    timestamp?: number;
  };
  description?: string;
  tags?: string[];
  updatedBy?: string;
}

interface Position {
  x: number;
  y: number;
}

interface Style {
  width?: number;
  height?: number;
  minWidth?: number;
}

interface NodeData {
  prompt?: string;
  systemPrompt?: string;
  defaultSystemPrompt?: string;
  model?: string;
  status?: string;
  collapsed?: boolean;
  error?: string;
  result?: string;
  inputs?: Record<string, string>;
  [key: string]: any;
}

export interface FlowNode {
  id: string;
  type: string;
  position: Position;
  style?: Style;
  data: NodeData;
  width?: number;
  height?: number;
  selected?: boolean;
  dragging?: boolean;
  positionAbsolute?: Position;
  resizing?: boolean;
}

interface FlowEdge {
  style?: {
    strokeWidth?: number;
  };
  type: string;
  markerEnd?: {
    type: string;
    width: number;
    height: number;
  };
  source: string;
  sourceHandle?: string;
  target: string;
  targetHandle?: string;
  id: string;
  selected?: boolean;
}

interface Viewport {
  x: number;
  y: number;
  zoom: number;
}

// Type guard for StoredFlow
export const isStoredFlow = (obj: any): obj is StoredFlow => {
  return (
    obj &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.createdBy === 'string' &&
    typeof obj.content === 'object' &&
    Array.isArray(obj.content.nodes) &&
    Array.isArray(obj.content.edges)
  );
};
