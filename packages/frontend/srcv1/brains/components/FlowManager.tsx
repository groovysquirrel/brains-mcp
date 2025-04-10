/**
 * Flow Manager Component
 * 
 * This is the top-level component that manages the flow editor and its state.
 */

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { FlowEditor } from './FlowEditor';
import FlowMenu from './FlowMenu';
import { 
  BaseNodeData, 
  FlowData,
  FlowVersion,
  FlowEditorHandle,
  NodeType,
  FlowNode,
  APIResponse
} from '../types';
import { get, post } from '@aws-amplify/api';
import { settingsManager } from '../../utils/settingsManager';
import NewFlowModal from './SaveLoad/NewFlowModal';
import LoadFlowModal from './SaveLoad/LoadFlowModal';
import { Icon } from '@blueprintjs/core';
import './FlowManager.css';
import { transformStateToClean, transformStateFromClean } from '../utils/transformData';
import { FlowController } from '../core/FlowController';

/**
 * Response type for flow list API calls
 * Contains information about available flows and their versions
 */
interface FlowListResponse {
  success: boolean;
  count: number;
  items: Array<{
    name: string;
    versionsCount: number;
    versions: Array<{
      version: string;
      createdAt: string;
      createdBy: string;
      itemId: string;
    }>;
  }>;
}

/**
 * Response type for individual flow API calls
 * Contains the flow data and metadata
 */
interface FlowResponse {
  success: boolean;
  data?: {
    content: FlowData;
    name: string;
    version: string;
  };
  error?: {
    message: string;
    details?: {
      code: string;
      statusCode: number;
    };
  };
}

/**
 * Increments the patch version number of a semantic version string
 * Example: "1.2.3" -> "1.2.4"
 */
const incrementPatchVersion = (version: string): string => {
  const [major, minor, patch] = version.split('.').map(Number);
  return `${major}.${minor}.${patch + 1}`;
};

// ============================================================================
// API Utilities
// ============================================================================

/**
 * Common API headers for flow operations
 */
const API_HEADERS = {
  'Content-Type': 'application/json'
};

/**
 * Creates a flow API payload with common properties
 */
const createFlowPayload = (name: string, version: string, content: FlowData) => ({
  dataType: "flow",
  updatedAt: new Date().toISOString(),
  operation: "create",
  name: name.toLowerCase().replace(/\s+/g, '_'),
  version,
  createdBy: "user",
  content: transformStateToClean({
    nodes: content.nodes,
    edges: content.edges,
    viewport: content.viewport || { x: 0, y: 0, zoom: 1 }
  }),
  tags: ["user-created"]
});

/**
 * Handles API errors consistently
 */
const handleApiError = (error: any, operation: string): { success: false; error: string } => {
  console.error(`Error ${operation}:`, error);
  return { success: false, error: `Failed to ${operation}` };
};

export const FlowManager: React.FC = () => {
  // ==========================================================================
  // State Management
  // ==========================================================================

  const [selectedFlow, setSelectedFlow] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [versions, setVersions] = useState<FlowVersion[]>([]);
  const [flowData, setFlowData] = useState<FlowData>({
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 }
  });

  const [showNewModal, setShowNewModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);

  const loadingRef = useRef(false);
  const loadingFlowRef = useRef<string | null>(null);
  const editorRef = useRef<FlowEditorHandle>(null);

  // ==========================================================================
  // Flow Execution
  // ==========================================================================

  const flowControllerRef = useRef<FlowController | null>(null);
  const isExecutingRef = useRef(false);

  // Initialize FlowController only when needed
  useEffect(() => {
    // Only skip structural updates during execution
    if (isExecutingRef.current) {
      console.log('⏸️ FlowManager: Skipping structural update during execution');
      return;
    }

    if (!flowControllerRef.current) {
      console.log('🔄 FlowManager: Initializing FlowController with:', {
        nodes: flowData.nodes.map(n => ({
          id: n.id,
          type: n.type,
          label: n.data.label,
          content: n.data.content,
          position: n.position
        })),
        edges: flowData.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle
        }))
      });
      flowControllerRef.current = new FlowController(
        flowData.nodes, 
        flowData.edges,
        (nodeId, state) => {
          console.log('🔄 FlowManager: Received state update from controller:', {
            nodeId,
            status: state.status,
            hasError: !!state.error
          });
          handleNodeUpdate(nodeId, {
            status: state.status,
            error: state.error,
            metadata: state.metadata
          });
        }
      );
    } else {
      // Only update structure, not execution state
      console.log('🔄 FlowManager: Updating FlowController structure with:', {
        nodes: flowData.nodes.map(n => ({
          id: n.id,
          type: n.type,
          label: n.data.label,
          content: n.data.content,
          position: n.position
        })),
        edges: flowData.edges.map(e => ({
          id: e.id,
          source: e.source,
          target: e.target,
          sourceHandle: e.sourceHandle,
          targetHandle: e.targetHandle
        }))
      });
      flowControllerRef.current.updateStructure(flowData.nodes, flowData.edges);
    }
  }, [flowData.nodes, flowData.edges]);

  // ==========================================================================
  // Node Operations
  // ==========================================================================

  const handleNodeUpdate = useCallback((nodeId: string, updates: Partial<BaseNodeData>) => {
    console.log('🔄 FlowManager: Updating node state:', { nodeId, updates });
    
    setFlowData(current => {
      // Find the node to update
      const nodeToUpdate = current.nodes.find(n => n.id === nodeId);
      if (!nodeToUpdate) {
        console.warn('⚠️ FlowManager: Node not found for update:', nodeId);
        return current;
      }

      // Create updated node with all callbacks preserved
      const updatedNode = {
        ...nodeToUpdate,
        data: {
          ...nodeToUpdate.data,
          ...updates,
          // Preserve all callbacks
          onUpdate: nodeToUpdate.data.onUpdate,
          onRemove: nodeToUpdate.data.onRemove,
          onCollapse: nodeToUpdate.data.onCollapse,
          onExecute: nodeToUpdate.data.onExecute
        }
      };

      // Update nodes array
      const updatedNodes = current.nodes.map(node => 
        node.id === nodeId ? updatedNode : node
      );

      // console.log('✅ FlowManager: Node state updated:', {
      //   nodeId,
      //   status: updatedNode.data.status,
      //   hasError: !!updatedNode.data.error
      // });

      // Return new state
      return {
        ...current,
        nodes: updatedNodes
      };
    });
  }, []);

  const handleNodeRemove = useCallback((nodeId: string) => {
    setFlowData(current => {
      const newNodes = current.nodes.filter(n => n.id !== nodeId);
      const newEdges = current.edges.filter(
        e => e.source !== nodeId && e.target !== nodeId
      );
      return { ...current, nodes: newNodes, edges: newEdges };
    });
  }, []);

  // ==========================================================================
  // Event Handlers
  // ==========================================================================

  const handleEditorStateChange = useCallback((state: FlowData) => {
    setFlowData(current => {
      if (JSON.stringify(current) === JSON.stringify(state)) {
        return current;
      }
      return state;
    });
  }, []);

  // ==========================================================================
  // Lifecycle Effects
  // ==========================================================================

  useEffect(() => {
    const lastFlow = settingsManager.getLastOpenFlow();
    if (lastFlow) {
      setSelectedFlow(lastFlow.name);
      setSelectedVersion(lastFlow.version);
      
      if (lastFlow.data) {
        const flowData: FlowData = {
          nodes: lastFlow.data.nodes || [],
          edges: lastFlow.data.edges || [],
          viewport: lastFlow.data.viewport || { x: 0, y: 0, zoom: 1 }
        };
        setFlowData(flowData);
      }
      
      if (lastFlow.versions && !settingsManager.shouldFetchVersions(lastFlow.name)) {
        setVersions(lastFlow.versions);
      } else {
        fetchVersions(lastFlow.name);
      }
    }
  }, []);

  useEffect(() => {
    if (selectedFlow && flowData) {
      settingsManager.updateLastOpenFlow(selectedFlow, selectedVersion, flowData);
    }
  }, [selectedFlow, selectedVersion, flowData]);

  useEffect(() => {
    const handleBeforeUnload = () => {
      if (selectedFlow && flowData) {
        settingsManager.updateLastOpenFlow(selectedFlow, selectedVersion, flowData);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [selectedFlow, selectedVersion, flowData]);

  // ==========================================================================
  // API Operations
  // ==========================================================================

  /**
   * Fetches versions for a flow
   * Updates the versions state and persists to settings
   */
  const fetchVersions = async (flowName: string) => {
    try {
      const restOperation = get({
        apiName: "brainsOS",
        path: "/latest/resources/user/flows"
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as FlowListResponse;
      
      if (responseData?.success) {
        const selectedItem = responseData.items.find(item => item.name === flowName);
        if (selectedItem) {
          const versions = selectedItem.versions.map(version => ({
            version: version.version,
            displayName: `v${version.version} (${new Date(version.createdAt).toLocaleDateString()})`,
            createdAt: version.createdAt,
            createdBy: version.createdBy,
            itemId: version.itemId
          }));
          
          setVersions(versions);
          
          if (flowName === selectedFlow) {
            settingsManager.updateLastOpenFlow(
              flowName,
              selectedVersion,
              flowData,
              versions
            );
          }
        }
      }
    } catch (error) {
      console.error('Error fetching versions:', error);
    }
  };

  /**
   * Saves the current flow state
   * Creates a new version with incremented patch number
   */
  const handleSave = async (): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('=== FlowManager Save ===');
      console.log('Starting save operation');
      console.log('Current flow:', selectedFlow);
      console.log('Current version:', selectedVersion);
      
      const newVersion = incrementPatchVersion(selectedVersion);
      const flowPayload = createFlowPayload(selectedFlow, newVersion, flowData);

      console.log('Save payload:', flowPayload);
      console.log('====================');

      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/resources/user/flows",
        options: {
          body: flowPayload as Record<string, any>,
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as FlowResponse;
      
      if (responseData?.success) {
        setSelectedVersion(newVersion);
        await fetchVersions(selectedFlow);
        // Update settings after successful save
        settingsManager.updateLastOpenFlow(
          selectedFlow,
          newVersion,
          flowData,
          versions
        );
        return { success: true };
      }

      if (responseData.error) {
        return { success: false, error: responseData.error.message };
      }
      
      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      return handleApiError(error, 'save flow');
    }
  };

  /**
   * Saves the current flow state as a new flow
   * Creates a new flow with version 0.0.1
   */
  const handleSaveAs = async (newName: string): Promise<{ success: boolean; error?: string }> => {
    try {
      console.log('=== FlowManager SaveAs ===');
      console.log('Starting save operation');
      console.log('New flow name:', newName);
      
      const flowPayload = createFlowPayload(newName, '0.0.1', flowData);

      console.log('SaveAs payload:', flowPayload);
      console.log('====================');

      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/resources/user/flows",
        options: {
          body: flowPayload as Record<string, any>,
          headers: API_HEADERS
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as FlowResponse;
      
      if (responseData?.success) {
        setSelectedFlow(newName);
        setSelectedVersion('0.0.1');
        await fetchVersions(newName);
        return { success: true };
      }

      if (responseData.error) {
        return { success: false, error: responseData.error.message };
      }
      
      return { success: false, error: 'Unknown error occurred' };
    } catch (error) {
      return handleApiError(error, 'save flow as');
    }
  };

  /**
   * Creates a new flow
   * Initializes an empty flow with the given name
   */
  const handleNewFlowSubmit = async (name: string): Promise<void> => {
    try {
      const emptyContent = {
        nodes: [],
        edges: [],
        viewport: { x: 0, y: 0, zoom: 1 }
      };

      const flowPayload = createFlowPayload(name, '0.0.1', emptyContent);

      const restOperation = post({
        apiName: "brainsOS",
        path: "/latest/resources/user/flows",
        options: {
          body: flowPayload as Record<string, any>,
          headers: API_HEADERS
        }
      });

      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as FlowResponse;

      if (responseData?.success) {
        // Clear the editor state using the ref
        if (editorRef.current) {
          editorRef.current.clearState();
        }
        // Then update the flow data and other states
        setFlowData(emptyContent);
        setSelectedFlow(name);
        setSelectedVersion('0.0.1');
        // Update settings after creating new flow
        settingsManager.updateLastOpenFlow(
          name,
          '0.0.1',
          emptyContent,
          []  // No versions yet for new flow
        );
        setShowNewModal(false);
      } else {
        throw new Error(responseData.error?.message || 'Failed to create flow');
      }
    } catch (error) {
      throw handleApiError(error, 'create new flow').error;
    }
  };

  /**
   * Loads a flow version
   * Fetches the flow data from the API and updates the editor state
   */
  const handleLoad = useCallback(async (flowName: string, version: string) => {
    try {
      const flowKey = `${flowName}-${version}`;
      
      if (loadingFlowRef.current === flowKey || loadingRef.current) {
        console.log('Already loading this flow');
        return;
      }
      
      loadingFlowRef.current = flowKey;
      loadingRef.current = true;

      const flowNameFormatted = flowName.toLowerCase().replace(/\s+/g, '_');
      
      const restOperation = get({
        apiName: "brainsOS",
        path: `/latest/resources/user/flows/${flowNameFormatted}/${version}`
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as FlowResponse;
      
      if (responseData?.success && responseData.data) {
        // Handle both old and new formats
        const content = responseData.data.content;
        
        // Transform content while ensuring defaults
        const transformedContent = 'nodes' in content 
          ? content 
          : transformStateFromClean(content);

        // Transform nodes to preserve positions and content but reset execution state
        const transformedNodes = transformedContent.nodes.map(node => {
          const layout = (node as any).layout || {};
          const state = (node as any).state || {};
          const nodeType = node.type as NodeType;
          
          return {
            id: node.id,
            type: nodeType,
            position: layout.position || { x: 0, y: 0 },
            data: {
              id: node.id,
              type: nodeType,
              position: layout.position || { x: 0, y: 0 },
              label: layout.label || node.id,
              isCollapsed: layout.collapsed || false,
              collapsed: layout.collapsed || false,
              selected: layout.selected || false,
              status: 'idle',  // Reset status to idle
              content: state.content || '',
              metadata: {},    // Reset metadata
              error: undefined, // Clear any errors
              dimensions: layout.dimensions || {
                width: 280,
                height: 200,
                minWidth: 280,
                minHeight: 200
              },
              handles: layout.handles || {},
              onUpdate: handleNodeUpdate,
              onRemove: handleNodeRemove,
              onCollapse: () => handleNodeUpdate(node.id, { isCollapsed: !layout.collapsed })
            },
            draggable: true,
            connectable: true,
            selectable: true
          } as FlowNode;
        });

        // Get the viewport from the transformed content, with fallback to default
        const savedViewport = transformedContent.viewport || { x: 0, y: 0, zoom: 1 };
        console.log('Loading saved viewport:', savedViewport);

        // Set the transformed state with the saved viewport
        const newFlowData: FlowData = {
          nodes: transformedNodes,
          edges: transformedContent.edges || [],
          viewport: savedViewport
        };

        // Clear the editor state first using the ref
        if (editorRef.current) {
          editorRef.current.clearState();
          // Then set the new state with the saved viewport
          editorRef.current.setEditorState(newFlowData);
          // Reset all nodes to idle state
          editorRef.current.resetNodesState();
        }

        // Update React state
        setFlowData(newFlowData);
        setSelectedFlow(flowName);
        setSelectedVersion(version);
        setShowLoadModal(false);

        // Update settings with the reset state
        settingsManager.updateLastOpenFlow(
          flowName,
          version,
          newFlowData,
          versions
        );
      }
    } catch (error) {
      console.error('Error loading flow:', error);
    } finally {
      loadingRef.current = false;
      loadingFlowRef.current = null;
    }
  }, [handleNodeUpdate, handleNodeRemove, versions]);

  /**
   * Renames a flow
   * Updates the flow name in the API and local state
   */
  const handleRename = useCallback(async (newName: string) => {
    try {
      const oldName = selectedFlow.toLowerCase().replace(/\s+/g, '_');
      const newNameFormatted = newName.toLowerCase().replace(/\s+/g, '_');
      
      const renamePayload = {
        operation: "rename",
        name: oldName,
        newName: newNameFormatted
      };

      const restOperation = post({
        apiName: "brainsOS",
        path: `/latest/resources/user/flows/${oldName}`,
        options: { 
          body: JSON.stringify(renamePayload),
          headers: {
            'Content-Type': 'application/json'
          }
        }
      });
      
      const response = await restOperation.response;
      const responseData = (await response.body.json() as unknown) as APIResponse<void>;
      
      if (responseData?.success) {
        setSelectedFlow(newName);
        await fetchVersions(newName);
        return { success: true };
      }
      return { success: false, error: responseData.error?.message };
    } catch (error) {
      console.error('Error renaming flow:', error);
      return { success: false, error: 'Failed to rename flow' };
    }
  }, [selectedFlow]);

  /**
   * Shows the new flow modal
   */
  const handleNew = useCallback(() => {
    setShowNewModal(true);
  }, []);

  /**
   * Shows the load flow modal
   */
  const handleLoadClick = () => {
    setShowLoadModal(true);
  };

  // ==========================================================================
  // Temporary Simple Node Execution
  // ==========================================================================

  const handleNodeExecutionRequest = useCallback(async (nodeId: string, input?: string) => {
    if (!flowControllerRef.current) {
      console.error('❌ FlowManager: No flow controller available');
      return;
    }
    
    const node = flowData.nodes.find(n => n.id === nodeId);
    if (!node) {
      console.error('❌ FlowManager: Node not found:', nodeId);
      return;
    }
    
    console.log('▶️ FlowManager: Starting execution for node:', {
      id: nodeId,
      type: node.type,
      input
    });

    isExecutingRef.current = true;
    try {
      // Execute via FlowController - state updates will come through the callback
      console.log('🎮 FlowManager: Delegating execution to FlowController');
      const result = await flowControllerRef.current.executeNode(nodeId, input);
      console.log('📦 FlowManager: Received execution result:', {
        nodeId,
        success: result.success,
        hasError: !!result.error,
        resultLength: result.result?.length
      });

      if (!result.success && result.error?.code !== 'NOT_READY') {
        // Update downstream nodes to error state for non-NOT_READY errors
        const connectedNodes = flowData.edges
          .filter(edge => edge.source === nodeId)
          .map(edge => edge.target);

        console.log('❌ FlowManager: Propagating error to downstream nodes:', connectedNodes);

        for (const targetNodeId of connectedNodes) {
          await new Promise<void>(resolve => {
            handleNodeUpdate(targetNodeId, { 
              status: 'error',
              error: {
                message: 'Upstream node failed',
                code: 'UPSTREAM_ERROR',
                details: { statusCode: 500, code: 'UpstreamError' }
              }
            });
            setTimeout(resolve, 0);
          });
        }
      }
    } catch (error) {
      console.error('❌ FlowManager: Unexpected error during execution:', error);
      // Handle unexpected errors in UI
      await new Promise<void>(resolve => {
        handleNodeUpdate(nodeId, {
          status: 'error',
          error: {
            message: error instanceof Error ? error.message : 'Unknown error',
            code: 'EXECUTION_ERROR',
            details: { statusCode: 500, code: 'UnknownError' }
          }
        });
        setTimeout(resolve, 0);
      });
    } finally {
      isExecutingRef.current = false;
    }
  }, [flowData.nodes, flowData.edges]);

  // ==========================================================================
  // Render
  // ==========================================================================

  return (
    <div className="flow-manager">
      <div className="flow-manager__content">
        {selectedFlow ? (
          <>
            <FlowMenu
              selectedFlow={selectedFlow}
              selectedVersion={selectedVersion}
              versions={versions}
              onSave={handleSave}
              onSaveAs={handleSaveAs}
              onRename={handleRename}
              onVersionChange={setSelectedVersion}
              onFlowSelect={handleLoad}
              onNew={handleNew}
            />
            <FlowEditor
              ref={editorRef}
              initialState={flowData}
              readOnly={false}
              onStateChange={handleEditorStateChange}
              onNodeUpdate={handleNodeUpdate}
              onNodeRemove={handleNodeRemove}
              onEdgeDelete={(edgeId: string) => {
                setFlowData(current => ({
                  ...current,
                  edges: current.edges.filter(e => e.id !== edgeId)
                }));
              }}
              onNodeExecutionRequest={handleNodeExecutionRequest}
            />
          </>
        ) : (
          <div className="initial-actions">
            <button onClick={handleNew}>
              <Icon icon="plus" />
              New Flow
            </button>
            <button onClick={handleLoadClick}>
              <Icon icon="folder-open" />
              Load Flow
            </button>
          </div>
        )}

        {showNewModal && (
          <NewFlowModal
            onSubmit={handleNewFlowSubmit}
            onCancel={() => setShowNewModal(false)}
          />
        )}

        {showLoadModal && (
          <LoadFlowModal
            onSelect={handleLoad}
            onCancel={() => setShowLoadModal(false)}
          />
        )}
      </div>
    </div>
  );
};

export default FlowManager;
