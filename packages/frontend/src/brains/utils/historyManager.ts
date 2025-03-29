import { FlowNode, FlowEdge, FlowState, Viewport } from '../types';

/**
 * Creates a complete snapshot of the current flow state
 */
export const createFlowSnapshot = (
  nodes: FlowNode[],
  edges: FlowEdge[],
  viewport: Viewport
): FlowState => {
  // Ensure complete node state
  const nodesWithState = nodes.map(node => ({
    ...node,
    data: {
      ...node.data,
      dimensions: node.data.dimensions,
      content: node.data.content,
      isCollapsed: node.data.isCollapsed || false,
      selected: node.data.selected || false,
      label: node.data.label || ''
    }
  }));

  return {
    nodes: nodesWithState,
    edges: [...edges],
    viewport: { ...viewport }
  };
};

/**
 * Compares two flow states to determine if they are different
 */
export const hasStateChanged = (current: FlowState, previous: FlowState): boolean => {
  const nodesChanged = JSON.stringify(current.nodes) !== JSON.stringify(previous.nodes);
  const edgesChanged = JSON.stringify(current.edges) !== JSON.stringify(previous.edges);
  
  return nodesChanged || edgesChanged;
};

/**
 * Creates a history stack with the given state
 */
export const createHistoryStack = (initialState: FlowState) => {
  return {
    past: [] as FlowState[],
    present: initialState,
    future: [] as FlowState[]
  };
};

/**
 * Pushes a new state to the history stack
 */
export const pushToHistory = (
  history: {
    past: FlowState[];
    present: FlowState;
    future: FlowState[];
  },
  newState: FlowState
) => {
  return {
    past: [...history.past, history.present],
    present: newState,
    future: []
  };
}; 