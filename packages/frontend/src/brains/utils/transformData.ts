import { FlowNode, FlowEdge, FlowState } from '../types';

interface CleanNodeLayout {
  position: { x: number; y: number };
  dimensions: { 
    width: number;
    height: number;
    minWidth: number;
    minHeight: number;
  };
  label: string;
  collapsed: boolean;
  selected: boolean;
  handles: {
    input?: Array<{ id: string; position: string; type: string }>;
    output?: Array<{ id: string; position: string; type: string }>;
  };
}

interface CleanNodeState {
  content: any;
  connections: {
    input?: string[];
    output?: string[];
  };
  metadata: Record<string, any>;
  status: string;
  onUpdate?: (id: string, updates: any) => void;
  onRemove?: (id: string) => void;
}

interface CleanNode {
  id: string;
  type: string;
  layout: CleanNodeLayout;
  state: CleanNodeState;
}

/**
 * Transform old format to new format for storage
 */
const transformNodeToClean = (node: FlowNode, edges: FlowEdge[]): CleanNode => {
  // Default dimensions
  const defaultDimensions = {
    width: 280,
    height: 200,
    minWidth: 280,
    minHeight: 200
  };

  // Extract connections from edges
  const connections = {
    input: edges
      .filter(edge => edge.target === node.id)
      .map(edge => `${edge.source}:${edge.sourceHandle}`),
    output: edges
      .filter(edge => edge.source === node.id)
      .map(edge => `${edge.target}:${edge.targetHandle}`)
  };

  // Ensure type is always a string
  if (!node.type) {
    throw new Error(`Node ${node.id} is missing required type property`);
  }

  // Ensure we have complete dimensions
  const dimensions = {
    ...defaultDimensions,
    ...(node.data?.dimensions || {})
  };

  return {
    id: node.id,
    type: node.type,
    layout: {
      position: node.position || { x: 0, y: 0 },
      dimensions,
      label: node.data?.label || '',
      collapsed: node.data?.isCollapsed || false,
      selected: node.data?.selected || false,
      handles: node.data?.handles || { input: [], output: [] }
    },
    state: {
      content: node.data?.content || '',
      connections,
      metadata: node.data?.metadata || {},
      status: node.data?.status || 'idle',
      onUpdate: node.data?.onUpdate,
      onRemove: node.data?.onRemove
    }
  };
};

/**
 * Transform new format back to old format for UI
 */
const transformNodeFromClean = (node: CleanNode): FlowNode => {
  // Default dimensions that match our UI requirements
  const defaultDimensions = {
    width: 280,
    height: 200,
    minWidth: 280,
    minHeight: 200
  };

  // Ensure we have valid position data
  const position = node.layout?.position || { x: 0, y: 0 };
  
  // Ensure we have valid dimensions by spreading defaults first
  const dimensions = {
    ...defaultDimensions,
    ...(node.layout?.dimensions || {})
  };

  return {
    id: node.id,
    type: node.type || 'default',
    position: {
      x: position.x,
      y: position.y
    },
    data: {
      id: node.id,
      type: node.type || 'default',
      dimensions, // Pass the complete dimensions object
      label: node.layout?.label || '',
      isCollapsed: node.layout?.collapsed || false,
      selected: node.layout?.selected || false,
      handles: node.layout?.handles || { input: [], output: [] },
      content: node.state?.content || '',
      metadata: node.state?.metadata || {},
      status: node.state?.status || 'idle',
      onUpdate: node.state?.onUpdate, // Preserve any callbacks
      onRemove: node.state?.onRemove
    }
  } as FlowNode;
};

/**
 * Transform entire state for storage
 */
export const transformStateToClean = (state: FlowState) => {
  const nodes = state.nodes.map(node => transformNodeToClean(node, state.edges));
  return {
    nodes,
    edges: state.edges,
    viewport: state.viewport || { x: 0, y: 0, zoom: 1 }
  };
};

/**
 * Transform entire state back for UI
 */
export const transformStateFromClean = (state: any): FlowState => {
  // Handle both old and new formats
  if ('nodes' in state) {
    return {
      nodes: state.nodes.map(transformNodeFromClean),
      edges: state.edges || [],
      viewport: state.viewport || { x: 0, y: 0, zoom: 1 }
    };
  }

  // If we have a clean format, transform it
  return {
    nodes: (state.nodes || []).map(transformNodeFromClean),
    edges: state.edges || [],
    viewport: state.viewport || { x: 0, y: 0, zoom: 1 }
  };
};
