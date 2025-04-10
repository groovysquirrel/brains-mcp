/**
 * Flow Editor Component
 * 
 * This is the core editor component of the Brains OS flow system. It serves as the main
 * interface for creating, editing, and managing flow diagrams. The component handles:
 * 
 * 1. Node Management:
 *    - Creation and deletion of nodes
 *    - Node positioning and dragging
 *    - Node resizing with undo/redo support
 *    - Node content updates
 * 
 * 2. Edge (Connection) Management:
 *    - Creating connections between nodes
 *    - Validating connections
 *    - Edge deletion and updates
 * 
 * 3. History Management:
 *    - Undo/Redo functionality for all operations
 *    - State snapshots at the end of operations
 *    - Debounced state capture for continuous operations
 * 
 * 4. State Persistence:
 *    - Maintains execution state across updates
 *    - Preserves node dimensions and positions
 *    - Handles viewport state
 * 
 * The component uses React Flow as its underlying graph visualization library but adds
 * several custom behaviors and UI elements specific to Brains OS.
 * 
 * @component
 * @example
 * ```tsx
 * <FlowEditor
 *   initialState={flowData}
 *   readOnly={false}
 *   onStateChange={(state) => handleStateChange(state)}
 *   onNodeUpdate={(id, updates) => handleNodeUpdate(id, updates)}
 *   onNodeRemove={(id) => handleNodeRemove(id)}
 *   onEdgeDelete={(id) => handleEdgeDelete(id)}
 * />
 * ```
 */

import React, { useState, useCallback, useEffect, useMemo, forwardRef, useImperativeHandle, useRef } from 'react';
import { 
  NodeChange, 
  EdgeChange, 
  Connection,
  applyNodeChanges,
  applyEdgeChanges,
  addEdge,
  NodePositionChange
} from 'reactflow';
import { FlowCanvas } from './FlowCanvas';
import { 
  FlowNode,
  FlowEdge,
  BaseNodeData,
  NodeType,
  Viewport,
  FlowEditorProps,
  FlowState,
  FlowData,
  FlowEditorHandle,
  NodeExecutionResult
} from '../types';
import { NodeFactory } from '../core/NodeFactory';
import { Icon, Divider } from '@blueprintjs/core';
import './FlowEditor.css';
import { NODE_TYPES } from '../nodes/types/nodeIndex';
import { createFlowSnapshot, createHistoryStack, pushToHistory } from '../utils/historyManager';

// ============================================================================
// Error Boundary Component
// ============================================================================

/**
 * Error Boundary for the Flow Editor
 * 
 * Catches and handles errors that occur within the Flow Editor component tree.
 * Prevents the entire application from crashing when an error occurs in the editor.
 */
class FlowEditorErrorBoundary extends React.Component<
  { children: React.ReactNode; fallback?: React.ReactNode; onError?: (error: Error) => void },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode; fallback?: React.ReactNode; onError?: (error: Error) => void }) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError?.(error);
  }

  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong. Please try again.</div>;
    }
    return this.props.children;
  }
}

// ============================================================================
// Main Flow Editor Component
// ============================================================================

export const FlowEditor = forwardRef<FlowEditorHandle, FlowEditorProps>(({
  initialState,
  readOnly = false,
  onStateChange,
  onError,
  errorFallback,
  onNodeUpdate,
  onNodeRemove,
  onEdgeDelete,
  onNodeExecutionRequest,
  onExecutionComplete,
  onExecutionError
}, ref) => {
  // ==========================================================================
  // State Management
  // ==========================================================================
  
  /**
   * State Management
   * 
   * The component maintains several pieces of state:
   * - nodes/edges: The core flow graph data
   * - viewport: The current view position and zoom
   * - isDragging/isResizing: Track ongoing operations
   * - dragStartState/resizeStartState: Capture initial states for undo
   * - history: Stack of previous states for undo/redo
   */
  const [nodes, setNodes] = useState<FlowNode[]>(initialState?.nodes || []);
  const [edges, setEdges] = useState<FlowEdge[]>(initialState?.edges || []);
  const [viewport, setViewport] = useState<Viewport>(initialState?.viewport || { x: 0, y: 0, zoom: 1 });

  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const resizeTimeoutRef = useRef<number | null>(null);
  
  const [dragStartState, setDragStartState] = useState<FlowState | null>(null);
  const [resizeStartState, setResizeStartState] = useState<FlowState | null>(null);

  const [history, setHistory] = useState(() => 
    createHistoryStack({ nodes, edges, viewport })
  );

  const callbacksRef = useRef({
    handleNodeUpdate: null as unknown as (nodeId: string, updates: Partial<BaseNodeData>) => void,
    handleNodeRemove: null as unknown as (nodeId: string) => void,
    pushHistory: null as unknown as (state: FlowState) => void
  });

  // Reset nodes when initialState changes
  useEffect(() => {
    if (initialState?.nodes) {
      setNodes(initialState.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Preserve existing execution state if it exists
          status: node.data.status || 'idle',
          error: node.data.error,
          metadata: {
            ...node.data.metadata,
            executionResult: node.data.metadata?.executionResult,
            executionMetadata: node.data.metadata?.executionMetadata
          },
          // Ensure callbacks are attached
          onUpdate: (id: string, updates: Partial<BaseNodeData>) => {
            onNodeUpdate?.(id, updates);
          },
          onRemove: (id: string) => {
            onNodeRemove?.(id);
          },
          onExecute: (id: string, input?: string) => {
            onNodeExecutionRequest?.(id, input);
          }
        }
      })));
    }
  }, [initialState, onNodeUpdate, onNodeRemove, onNodeExecutionRequest]);

  // ==========================================================================
  // History Management
  // ==========================================================================

  /**
   * Pushes the current state to the history stack
   * 
   * Creates a deep snapshot of the current state including:
   * - Node positions and dimensions
   * - Edge connections
   * - Viewport state
   * - Execution state and metadata
   * 
   * This is called at the end of operations like:
   * - Node dragging
   * - Node resizing (debounced)
   * - Edge creation/deletion
   */
  const pushHistory = useCallback((state: FlowState) => {
    // Create a deep copy of the state to ensure we capture all properties
    const snapshot = createFlowSnapshot(
      state.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Preserve execution state in history
          status: node.data.status,
          error: node.data.error,
          metadata: node.data.metadata
        }
      })),
      state.edges,
      state.viewport
    );
    
    setHistory(curr => pushToHistory(curr, snapshot));
  }, []);

  // Update callback ref
  useEffect(() => {
    callbacksRef.current.pushHistory = pushHistory;
  }, [pushHistory]);

  /**
   * Handles changes to nodes from ReactFlow
   * 
   * This is the central handler for all node modifications. It:
   * 1. Preserves execution state during updates
   * 2. Handles drag operations:
   *    - Captures initial state when drag starts
   *    - Updates history when drag ends with changes
   * 3. Handles resize operations:
   *    - Captures initial state when resize starts
   *    - Debounces resize events
   *    - Updates history when resize ends with changes
   * 4. Skips history updates for undo/redo operations
   */
  const handleNodesChange = useCallback((changes: NodeChange[]) => {
    if (readOnly) return;

    // Get current execution states before applying changes
    const executionStates = new Map(nodes.map(node => [
      node.id,
      {
        status: node.data.status,
        error: node.data.error,
        metadata: node.data.metadata
      }
    ]));

    // Apply changes while preserving execution states
    let updatedNodes = applyNodeChanges(changes, nodes).map(node => {
      const existingNode = nodes.find(n => n.id === node.id);
      const executionState = executionStates.get(node.id);
      
      return {
        ...node,
        data: {
          ...node.data,
          // Preserve execution state
          status: executionState?.status || node.data.status,
          error: executionState?.error || node.data.error,
          metadata: {
            ...(existingNode?.data.metadata || {}),
            ...(executionState?.metadata || {}),
          },
          // Preserve dimensions from existing node
          dimensions: existingNode?.data.dimensions || {
            width: 280,
            height: 200,
            minWidth: 280,
            minHeight: 400
          }
        }
      };
    }) as FlowNode[];

    // Skip state capture for undo/redo operations
    const isUndoRedo = changes.some(change => 
      change.type === 'add' || change.type === 'remove'
    );
    
    if (isUndoRedo) {
      setNodes(updatedNodes);
      return;
    }

    // Detect drag and resize changes
    const dragChange = changes.find(change => change.type === 'position') as NodePositionChange | undefined;
    const dimensionChange = changes.find(change => change.type === 'dimensions') as { id: string; type: 'dimensions'; dimensions: BaseNodeData['dimensions'] } | undefined;
    
    // Start of drag
    if (dragChange?.dragging && !isDragging) {
      // Capture the start state
      const startState = {
        nodes: nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            dimensions: { ...node.data.dimensions }
          }
        })),
        edges: edges.map(edge => ({ ...edge })),
        viewport: { ...viewport }
      };

      setIsDragging(true);
      setDragStartState(startState);
    }

    // Start of resize
    if (dimensionChange && !isResizing) {
      console.log('🔄 Starting resize operation:', {
        nodeId: dimensionChange.id,
        currentDimensions: dimensionChange.dimensions,
        isResizing
      });
      // Capture the start state
      const startState = {
        nodes: nodes.map(node => ({
          ...node,
          data: {
            ...node.data,
            dimensions: { ...node.data.dimensions }
          }
        })),
        edges: edges.map(edge => ({ ...edge })),
        viewport: { ...viewport }
      };

      setIsResizing(true);
      setResizeStartState(startState);
    }
    
    // End of drag
    if (dragChange && !dragChange.dragging && isDragging) {
      const startState = dragStartState;
      
      if (startState && dragChange.id) {
        const changedNode = updatedNodes.find(node => node.id === dragChange.id);
        const startNode = startState.nodes.find(node => node.id === dragChange.id);
        
        // Check if there was an actual position change
        const hasChanged = changedNode && startNode && (
          changedNode.position.x !== startNode.position.x ||
          changedNode.position.y !== startNode.position.y
        );

        if (hasChanged) {
          // Create a complete snapshot of the new state
          const completeState = {
            nodes: updatedNodes.map(node => ({
              ...node,
              data: {
                ...node.data,
                dimensions: { ...node.data.dimensions }
              }
            })),
            edges: edges.map(edge => ({ ...edge })),
            viewport: { ...viewport }
          };
          pushHistory(completeState);
        }
      }

      setIsDragging(false);
      setDragStartState(null);
    }

    // End of resize (using debounce to detect end of resize)
    if (dimensionChange && isResizing) {
      console.log('📏 Processing resize change:', {
        nodeId: dimensionChange.id,
        newDimensions: dimensionChange.dimensions,
        isResizing
      });

      // Clear any existing timeout
      if (resizeTimeoutRef.current !== null) {
        clearTimeout(resizeTimeoutRef.current);
      }

      // Set a new timeout to handle the end of resize
      resizeTimeoutRef.current = window.setTimeout(() => {
        const startState = resizeStartState;
        
        if (startState && dimensionChange.id) {
          const startNode = startState.nodes.find(node => node.id === dimensionChange.id);
          
          // Check if there was an actual dimension change using the dimensions from the event
          const hasChanged = startNode && (
            dimensionChange.dimensions.width !== startNode.data.dimensions.width ||
            dimensionChange.dimensions.height !== startNode.data.dimensions.height
          );

          console.log('📐 Final resize comparison:', {
            nodeId: dimensionChange.id,
            startDimensions: startNode?.data.dimensions,
            newDimensions: dimensionChange.dimensions,
            hasChanged
          });

          if (hasChanged) {
            // Create a complete snapshot of the new state, incorporating the new dimensions
            const completeState = {
              nodes: nodes.map(node => ({
                ...node,
                data: {
                  ...node.data,
                  dimensions: node.id === dimensionChange.id 
                    ? dimensionChange.dimensions 
                    : node.data.dimensions
                }
              })),
              edges: edges.map(edge => ({ ...edge })),
              viewport: { ...viewport }
            };
            console.log('💾 Pushing final resize state to history');
            pushHistory(completeState);
          }
        }
        setIsResizing(false);
        setResizeStartState(null);
        resizeTimeoutRef.current = null;
      }, 100); // Wait 100ms of no resize events before considering it complete
    }

    // Always update nodes with the changes
    setNodes(updatedNodes);
  }, [nodes, edges, viewport, isDragging, dragStartState, isResizing, resizeStartState, readOnly, pushHistory]);

  /**
   * Restores a flow state with reattached callbacks
   * 
   * Used by undo/redo operations to:
   * 1. Reset any ongoing operations (drag/resize)
   * 2. Restore node/edge state
   * 3. Reattach all necessary callbacks
   * 4. Ensure dimensions are properly set
   */
  const restoreState = useCallback((state: FlowState) => {
    // Reset interaction states
    setIsDragging(false);
    setIsResizing(false);
    setDragStartState(null);
    setResizeStartState(null);

    // Create the restored state with dimension updates
    const restoredNodes = state.nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        // Preserve execution state
        status: node.data.status,
        error: node.data.error,
        metadata: node.data.metadata,
        // Ensure dimensions are properly set
        dimensions: {
          width: node.data.dimensions?.width ?? 280,
          height: node.data.dimensions?.height ?? 200,
          minWidth: node.data.dimensions?.minWidth ?? 280,
          minHeight: node.data.dimensions?.minHeight ?? 400
        },
        // Reattach callbacks
        onUpdate: async (id: string, updates: Partial<BaseNodeData>) => {
          await callbacksRef.current.handleNodeUpdate(id, updates);
        },
        onRemove: (id: string) => {
          const newNodes = state.nodes.filter(n => n.id !== id);
          const newEdges = state.edges.filter(e => e.source !== id && e.target !== id);
          setNodes(newNodes);
          setEdges(newEdges);
          callbacksRef.current.pushHistory({ nodes: newNodes, edges: newEdges, viewport: state.viewport });
        },
        onCollapse: async () => {
          await callbacksRef.current.handleNodeUpdate(node.id, { 
            isCollapsed: !node.data.isCollapsed 
          });
        }
      }
    }));

    // Update state
    setEdges(state.edges);
    setViewport(state.viewport);
    setNodes(restoredNodes);

    return {
      nodes: restoredNodes,
      edges: state.edges,
      viewport: state.viewport
    };
  }, []);

  /**
   * Handles the undo operation
   * Restores the previous state from the history stack
   */
  const handleUndo = useCallback(() => {
    if (!history.past.length || readOnly) return;
    
    const previous = history.past[history.past.length - 1];
    const restoredState = restoreState(previous);
    
    // Use setTimeout to ensure state updates complete before updating history
    setTimeout(() => {
      setHistory(curr => ({
        past: curr.past.slice(0, -1),
        present: restoredState,
        future: [curr.present, ...curr.future]
      }));
    }, 0);
  }, [history.past, readOnly, restoreState]);

  /**
   * Handles the redo operation
   * Restores a previously undone state
   */
  const handleRedo = useCallback(() => {
    if (!history.future.length || readOnly) return;
    
    setHistory(curr => {
      const next = curr.future[0];
      const restoredState = restoreState(next);
      
      return {
        past: [...curr.past, curr.present],
        present: restoredState,
        future: curr.future.slice(1)
      };
    });
  }, [history.future, readOnly, restoreState]);

  // ==========================================================================
  // Node Management
  // ==========================================================================

  /**
   * Reference for tracking content update timeouts
   * Used to debounce content updates
   */
  const contentUpdateTimeoutRef = useRef<number | null>(null);

  /**
   * Cleanup effect for content update timeout
   */
  useEffect(() => {
    return () => {
      if (contentUpdateTimeoutRef.current) {
        clearTimeout(contentUpdateTimeoutRef.current);
      }
    };
  }, []);

  /**
   * Handles updates to node data
   */
  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<BaseNodeData>) => {
    console.log('🔄 FlowEditor: Received node update:', { nodeId, updates });
    setNodes(current => {
      const updatedNodes = current.map(node => 
        node.id === nodeId
          ? {
              ...node,
              data: {
                ...node.data,
                ...updates,
                // Preserve callbacks
                onUpdate: node.data.onUpdate,
                onRemove: node.data.onRemove,
                onExecute: node.data.onExecute
              }
            }
          : node
      );
      console.log('✅ FlowEditor: Updated node state:', {
        nodeId,
        status: updates.status,
        hasError: !!updates.error
      });
      return updatedNodes;
    });
  }, []);

  // Update callback ref
  useEffect(() => {
    callbacksRef.current.handleNodeUpdate = handleNodeUpdate;
  }, [handleNodeUpdate]);

  // ==========================================================================
  // Edge Management
  // ==========================================================================

  /**
   * Validates edge connections
   * Ensures that:
   * - Both source and target nodes exist
   * - No self-connections
   * - No duplicate connections
   */
  const validateEdge = useCallback((connection: Connection) => {
    const sourceNode = nodes.find(n => n.id === connection.source);
    const targetNode = nodes.find(n => n.id === connection.target);
    
    if (!sourceNode || !targetNode) return false;
    if (connection.source === connection.target) return false;
    
    const isDuplicate = edges.some(
      edge => edge.source === connection.source && edge.target === connection.target
    );
    
    return !isDuplicate;
  }, [nodes, edges]);

  /**
   * Handles changes to edges
   * Updates edge state and pushes changes to history
   */
  const handleEdgesChange = useCallback((changes: EdgeChange[]) => {
    if (readOnly) return;
    
    const newEdges = applyEdgeChanges(changes, edges) as FlowEdge[];
    setEdges(newEdges);
    pushHistory({ nodes, edges: newEdges, viewport });
  }, [nodes, edges, viewport, readOnly, pushHistory]);

  /**
   * Handles new edge connections
   * Validates the connection and updates the edge state
   */
  const handleConnect = useCallback((connection: Connection) => {
    if (readOnly || !validateEdge(connection)) return;

    const newEdges = addEdge(connection, edges) as FlowEdge[];
    setEdges(newEdges);
    pushHistory({ nodes, edges: newEdges, viewport });
  }, [nodes, edges, viewport, validateEdge, readOnly, pushHistory]);

  // ==========================================================================
  // Viewport Management
  // ==========================================================================

  /**
   * Handles viewport changes
   * Updates viewport state only for significant changes
   */
  const handleViewportChange = useCallback((newViewport: Viewport) => {
    if (
      Math.abs(newViewport.x - viewport.x) < 1 &&
      Math.abs(newViewport.y - viewport.y) < 1 &&
      Math.abs(newViewport.zoom - viewport.zoom) < 0.01
    ) {
      return;
    }
    setViewport(newViewport);
  }, [viewport]);

  // ==========================================================================
  // Node Creation
  // ==========================================================================

  /**
   * Calculates the position for a new node
   * Places nodes in a logical layout based on their type and existing nodes
   */
  const calculateNodePosition = useCallback((type: NodeType) => {
    const typeNodes = nodes.filter(n => n.type === type);
    const spacing = 20;
    
    // Get current viewport center
    const viewportCenter = {
      x: -viewport.x + window.innerWidth / 2 / viewport.zoom,
      y: -viewport.y + window.innerHeight / 2 / viewport.zoom
    };
    
    // Position first node of each type
    if (typeNodes.length === 0) {
      const columnOffset = {
        input: -400,  // Left side
        prompt: 0,    // Center
        output: 400,  // Right side
        data: 0       // Center
      }[type];
      
      return { 
        x: viewportCenter.x + columnOffset, 
        y: viewportCenter.y - 100  // Slightly above center
      };
    }

    // Position subsequent nodes
    const lastNode = typeNodes[typeNodes.length - 1];
    const newPosition = {
      x: lastNode.position.x + spacing,
      y: lastNode.position.y + lastNode.data.dimensions.height + spacing
    };

    // Ensure position is visible
    const margin = 100;
    const viewportBounds = {
      left: -viewport.x / viewport.zoom,
      right: (-viewport.x + window.innerWidth) / viewport.zoom,
      top: -viewport.y / viewport.zoom,
      bottom: (-viewport.y + window.innerHeight) / viewport.zoom
    };

    if (newPosition.x < viewportBounds.left + margin) {
      newPosition.x = viewportBounds.left + margin;
    }
    if (newPosition.x > viewportBounds.right - margin) {
      newPosition.x = viewportBounds.right - margin;
    }
    if (newPosition.y < viewportBounds.top + margin) {
      newPosition.y = viewportBounds.top + margin;
    }
    if (newPosition.y > viewportBounds.bottom - margin) {
      newPosition.y = viewportBounds.bottom - margin;
    }

    return newPosition;
  }, [nodes, viewport]);

  /**
   * Creates a new node of the specified type
   * Positions it appropriately and initializes its data
   */
  const addNode = useCallback((type: NodeType) => {
    if (readOnly) return;

    const position = calculateNodePosition(type);
    const newNode = NodeFactory.createNode(type, `${type}-${Date.now()}`, position);
    
    // Add editor callbacks to the node data
    newNode.data = {
      ...newNode.data,
      onUpdate: callbacksRef.current.handleNodeUpdate,
      onRemove: (id: string) => {
        const newNodes = nodes.filter(n => n.id !== id);
        const newEdges = edges.filter(e => e.source !== id && e.target !== id);
        setNodes(newNodes);
        setEdges(newEdges);
        callbacksRef.current.pushHistory({ nodes: newNodes, edges: newEdges, viewport });
      },
      onCollapse: () => callbacksRef.current.handleNodeUpdate(newNode.id, { isCollapsed: !newNode.data.isCollapsed })
    };

    const newNodes = [...nodes, newNode];
    setNodes(newNodes);
    pushHistory({ nodes: newNodes, edges, viewport });
  }, [nodes, edges, viewport, readOnly, calculateNodePosition, pushHistory]);

  // ==========================================================================
  // Execution Management
  // ==========================================================================

  const updateNodeExecutionState = useCallback((nodeId: string, result: NodeExecutionResult) => {
    // Synchronous state update
    setNodes(current => current.map(node => {
      if (node.id === nodeId) {
        return {
          ...node,
          data: {
            ...node.data,
            status: result.success ? 'complete' : 'error',
            error: result.error,
            metadata: {
              ...node.data.metadata,
              executionResult: result.result,
              executionMetadata: result.metadata,
              lastExecutionTime: Date.now()
            }
          }
        };
      }
      return node;
    }));

    if (result.success) {
      onExecutionComplete?.(nodeId, result);
    } else if (result.error) {
      const error = new Error(result.error.message);
      error.name = result.error.code;
      if (result.error.details) {
        (error as any).details = result.error.details;
      }
      onExecutionError?.(nodeId, error);
    }
  }, [onExecutionComplete, onExecutionError]);

  const handleNodeExecution = useCallback(async (nodeId: string) => {
    const targetNode = nodes.find(n => n.id === nodeId);
    if (!targetNode) return;

    // For input nodes, reset the entire flow first
    if (targetNode.type === 'input') {
      // Reset all nodes synchronously
      setNodes(current => current.map(n => ({
        ...n,
        data: {
          ...n.data,
          status: n.id === nodeId ? 'running' : 'idle',
          error: undefined,
          metadata: {
            ...n.data.metadata,
            lastExecutionTime: n.id === nodeId ? Date.now() : undefined,
            executionResult: undefined,
            executionMetadata: undefined
          }
        }
      } as FlowNode)));
    } else {
      // Update single node synchronously
      setNodes(current => current.map(n => {
        if (n.id === nodeId) {
          return {
            ...n,
            data: {
              ...n.data,
              status: 'running',
              error: undefined,
              metadata: {
                ...n.data.metadata,
                lastExecutionTime: Date.now()
              }
            }
          } as FlowNode;
        }
        return n;
      }));
    }

    // Call the parent's execution handler
    if (onNodeExecutionRequest) {
      await onNodeExecutionRequest(nodeId);
    }
  }, [nodes, onNodeExecutionRequest]);

  const resetNodesState = useCallback(() => {
    const resetNodes = nodes.map(node => ({
      ...node,
      data: {
        ...node.data,
        status: 'idle' as const,
        error: undefined,
        metadata: {
          ...node.data.metadata,
          executionResult: undefined,
          executionMetadata: undefined
        }
      }
    }));

    setNodes(resetNodes);
  }, [nodes]);

  // ==========================================================================
  // Render
  // ==========================================================================

  /**
   * Memoized nodes with updated callbacks
   * Prevents unnecessary re-renders of node components
   */
  const memoizedNodes = useMemo(() => nodes.map(node => {
    const currentNode = nodes.find(n => n.id === node.id);
    return {
      ...node,
      data: {
        ...node.data,
        status: currentNode?.data.status || node.data.status,
        error: currentNode?.data.error || node.data.error,
        metadata: {
          ...node.data.metadata,
          ...(currentNode?.data.metadata || {})
        },
        onUpdate: (id: string, updates: Partial<BaseNodeData>) => {
          console.log('📝 Node update requested:', { id, updates });
          callbacksRef.current.handleNodeUpdate(id, updates);
        },
        onRemove: (id: string) => {
          console.log('🗑️ Node remove requested:', { id });
          const newNodes = nodes.filter(n => n.id !== id);
          const newEdges = edges.filter(e => e.source !== id && e.target !== id);
          setNodes(newNodes);
          setEdges(newEdges);
          callbacksRef.current.pushHistory({ nodes: newNodes, edges: newEdges, viewport });
          onNodeRemove?.(id);
        },
        onCollapse: () => {
          console.log('🔽 Node collapse toggled:', { id: node.id });
          const isCollapsed = !node.data.isCollapsed;
          const prevDimensions = node.data.dimensions;
          callbacksRef.current.handleNodeUpdate(node.id, {
            isCollapsed,
            dimensions: {
              ...prevDimensions,
              height: isCollapsed ? 100 : prevDimensions.height
            }
          });
        },
        onExecute: () => {
          console.log('▶️ Execute requested for node:', { id: node.id });
          handleNodeExecution(node.id);
        }
      }
    };
  }), [nodes, edges, viewport, handleNodeExecution, onNodeRemove]);

  // ==========================================================================
  // External Interface
  // ==========================================================================

  /**
   * Exposes methods to the parent component through the ref
   * This allows the parent to:
   * - Get the current editor state
   * - Set a new editor state
   * - Clear the editor
   * - Perform undo/redo operations
   */
  useImperativeHandle<FlowEditorHandle, FlowEditorHandle>(ref, () => ({
    getCurrentState: () => ({
      nodes,
      edges,
      viewport
    }),
    setEditorState: (state: FlowData) => {
      if (!state) return;
      
      const newNodes = state.nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          status: 'idle' as const,
          error: undefined,
          metadata: {
            ...node.data.metadata,
            executionResult: undefined,
            executionMetadata: undefined
          }
        }
      }));
      const newEdges = state.edges || [];
      const newViewport = state.viewport || { x: 0, y: 0, zoom: 1 };
      
      setNodes(newNodes);
      setEdges(newEdges);
      setViewport(newViewport);
      pushHistory({ nodes: newNodes, edges: newEdges, viewport: newViewport });
    },
    clearState: () => {
      setNodes([]);
      setEdges([]);
      setViewport({ x: 0, y: 0, zoom: 1 });
      pushHistory({ nodes: [], edges: [], viewport: { x: 0, y: 0, zoom: 1 } });
    },
    undo: handleUndo,
    redo: handleRedo,
    canUndo: () => history.past.length > 0,
    canRedo: () => history.future.length > 0,
    updateNodeExecutionState,
    resetNodesState
  }), [nodes, edges, viewport, handleUndo, handleRedo, history.past.length, history.future.length, pushHistory, updateNodeExecutionState, resetNodesState]);

  /**
   * Ref to track previous state for change detection
   */
  const prevStateRef = useRef('');

  /**
   * Notifies the parent component of state changes
   * Debounces viewport changes to prevent excessive updates
   */
  useEffect(() => {
    // Only notify if we have a callback
    if (!onStateChange) return;

    const currentState = {
      nodes,
      edges,
      viewport
    };

    // Compare current state with previous, excluding volatile properties
    const stateForComparison = {
      nodes: nodes.map(node => ({
        ...node,
        data: {
          ...node.data,
          // Only include stable properties for comparison
          id: node.data.id,
          type: node.data.type,
          position: node.data.position,
          dimensions: node.data.dimensions,
          isCollapsed: node.data.isCollapsed,
          content: node.data.content,
          modelId: node.data.modelId,
          systemPrompt: node.data.systemPrompt,
          handles: node.data.handles
        }
      })),
      edges: edges.map(edge => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle
      }))
    };
    
    const currentStateStr = JSON.stringify(stateForComparison);
    
    // Only notify if there are actual structural changes
    if (prevStateRef.current !== currentStateStr) {
      const timeoutId = setTimeout(() => {
        console.log('FlowEditor - Structural state change detected');
        onStateChange(currentState);
        prevStateRef.current = currentStateStr;
      }, 100);

      return () => clearTimeout(timeoutId);
    }
  }, [nodes, edges, viewport, onStateChange]);

  // Cleanup resize timeout
  useEffect(() => {
    return () => {
      if (resizeTimeoutRef.current !== null) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, []);

  return (
    <FlowEditorErrorBoundary fallback={errorFallback} onError={onError}>
      <div className="flow-editor">
        <div className="flow-editor__toolbar">
          <div className="flow-editor__node-controls">
            <button className="flow-button" onClick={() => addNode('input')} disabled={readOnly}>
              <Icon icon="plus" /> Input Node
            </button>
            <button className="flow-button" onClick={() => addNode('prompt')} disabled={readOnly}>
              <Icon icon="plus" /> Prompt Node
            </button>
            <button className="flow-button" onClick={() => addNode('output')} disabled={readOnly}>
              <Icon icon="plus" /> Output Node
            </button>
            <button className="flow-button" onClick={() => addNode('data')} disabled={readOnly}>
              <Icon icon="plus" /> Data Node
            </button>
            <Divider />
            <button 
              className="flow-button" 
              onClick={handleUndo} 
              disabled={!history.past.length || readOnly}
            >
              <Icon icon="undo" /> Undo
            </button>
            <button 
              className="flow-button" 
              onClick={handleRedo} 
              disabled={!history.future.length || readOnly}
            >
              <Icon icon="redo" /> Redo
            </button>
          </div>
        </div>
        <FlowCanvas
          nodes={memoizedNodes}
          edges={edges}
          nodeTypes={NODE_TYPES}
          onNodesChange={handleNodesChange}
          onEdgesChange={handleEdgesChange}
          onConnect={handleConnect}
          onViewportChange={handleViewportChange}
          onNodeUpdate={(id: string, updates: Partial<BaseNodeData>) => {
            onNodeUpdate?.(id, updates);
          }}
          onNodeRemove={(id: string) => {
            onNodeRemove?.(id);
          }}
          onEdgeDelete={(edgeId: string) => {
            onEdgeDelete?.(edgeId);
          }}
          viewport={viewport}
        />
      </div>
    </FlowEditorErrorBoundary>
  );
});

export default FlowEditor;
