/**
 * Flow Controller
 * 
 * Manages the execution flow between nodes, including:
 * - Node execution order
 * - Data passing between nodes
 * - Error handling and recovery
 * - Execution state management
 */

import { Node, Edge } from 'reactflow';
import { 
  BaseNodeData, 
  NodeExecutionResult,
  NodeStatus,
  ExecutionError
} from '../types';
import { FlowExecutor } from './FlowExecutor';

interface ExecutionMetadata {
  startTime: number;
  endTime?: number;
  processingTimeMs?: number;
  executionResult?: string;
  executionMetadata?: {
    processingTimeMs: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  lastExecutionTime?: number;
  waitingForInputs?: string[];
}

interface ExecutionState {
  status: NodeStatus;
  result?: string;
  error?: ExecutionError;
  metadata?: ExecutionMetadata;
}

interface ExecutionContext {
  nodeId: string;
  inputs: { [key: string]: string };
  status: NodeStatus;
  result?: string;
  error?: ExecutionError;
  metadata?: ExecutionMetadata;
}

export class FlowController {
  private nodes: Node<BaseNodeData>[];
  private edges: Edge[];
  private executionContexts: Map<string, ExecutionContext> = new Map();
  private stateUpdateCallback?: (nodeId: string, state: ExecutionState) => void;

  constructor(
    nodes: Node<BaseNodeData>[], 
    edges: Edge[],
    onStateUpdate?: (nodeId: string, state: ExecutionState) => void
  ) {
    this.nodes = nodes;
    this.edges = edges;
    this.stateUpdateCallback = onStateUpdate;
    this.executionContexts = new Map();

    // Initialize execution contexts for all nodes
    nodes.forEach(node => {
      if (node.type === 'input' && node.data.content) {
        this.executionContexts.set(node.id, {
          nodeId: node.id,
          inputs: {},
          status: 'idle',
          result: typeof node.data.content === 'string' ? node.data.content : '',
          metadata: {
            startTime: Date.now()
          }
        });
      } else {
        this.executionContexts.set(node.id, {
          nodeId: node.id,
          inputs: {},
          status: 'idle',
          metadata: {
            startTime: Date.now()
          }
        });
      }
    });
  }

  /**
   * Updates the controller's state with new nodes and edges
   * This will reset execution contexts
   */
  updateState(nodes: Node<BaseNodeData>[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;
    this.resetExecutionState();
  }

  /**
   * Updates only the structure (nodes and edges) without resetting execution state
   * Use this when only the graph structure changes, not execution state
   */
  updateStructure(nodes: Node<BaseNodeData>[], edges: Edge[]) {
    this.nodes = nodes;
    this.edges = edges;

    nodes.forEach(node => {
      if (!this.executionContexts.has(node.id)) {
        this.executionContexts.set(node.id, {
          nodeId: node.id,
          inputs: {},
          status: 'idle',
          metadata: {
            startTime: Date.now()
          }
        });
      }
    });

    Array.from(this.executionContexts.keys()).forEach(nodeId => {
      if (!nodes.find(n => n.id === nodeId)) {
        this.executionContexts.delete(nodeId);
      }
    });
  }

  /**
   * Resets all execution contexts
   */
  resetExecutionState() {
    this.executionContexts.clear();
  }

  /**
   * Gets all input nodes that feed into a target node
   */
  private getInputNodes(nodeId: string): Node<BaseNodeData>[] {
    return this.edges
      .filter(edge => edge.target === nodeId)
      .map(edge => this.nodes.find(n => n.id === edge.source))
      .filter((node): node is Node<BaseNodeData> => node !== undefined);
  }

  /**
   * Gets all output nodes that a source node feeds into
   */
  private getOutputNodes(nodeId: string): Node<BaseNodeData>[] {
    return this.edges
      .filter(edge => edge.source === nodeId)
      .map(edge => this.nodes.find(n => n.id === edge.target))
      .filter((node): node is Node<BaseNodeData> => node !== undefined);
  }

  /**
   * Checks if a node is ready to execute
   */
  private isNodeReady(nodeId: string): boolean {
    const inputNodes = this.getInputNodes(nodeId);
    return inputNodes.every(node => {
      const context = this.executionContexts.get(node.id);
      // For data nodes, check if they have content OR their inputs are complete
      if (node.type === 'data') {
        if (node.data.content) {
          return true;
        }
        // If no content, check if input nodes are complete
        const dataInputNodes = this.getInputNodes(node.id);
        return dataInputNodes.every(inputNode => {
          const inputContext = this.executionContexts.get(inputNode.id);
          return inputContext?.status === 'complete';
        });
      }
      // For other nodes, check for complete status
      return context?.status === 'complete';
    });
  }

  /**
   * Gets all connected data nodes in a chain
   */
  private getConnectedDataNodes(nodeId: string, visited = new Set<string>()): Node<BaseNodeData>[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const node = this.nodes.find(n => n.id === nodeId);
    if (!node || node.type !== 'data') return [];

    const connectedNodes = this.edges
      .filter(edge => edge.target === nodeId)
      .map(edge => this.nodes.find(n => n.id === edge.source))
      .filter((n): n is Node<BaseNodeData> => n !== undefined && n.type === 'data');

    return [node, ...connectedNodes.flatMap(n => this.getConnectedDataNodes(n.id, visited))];
  }

  /**
   * Gets combined inputs for a node from its input nodes
   */
  private getNodeInputs(nodeId: string): { [key: string]: string } {
    const inputs: { [key: string]: string } = {};
    const inputNodes = this.getInputNodes(nodeId);

    inputNodes.forEach(inputNode => {
      const context = this.executionContexts.get(inputNode.id);

      if (inputNode.type === 'data') {
        // For data nodes, first check if they have their own content
        if (inputNode.data.content) {
          const label = inputNode.data.label || 'data';
          inputs[`data:${label}`] = inputNode.data.content as string;
        } 
        // If no content, check for upstream results
        else if (context?.result) {
          const label = inputNode.data.label || 'data';
          inputs[`data:${label}`] = context.result;
        }
        // If neither, check connected data nodes
        else {
          const dataChain = this.getConnectedDataNodes(inputNode.id);
          dataChain.forEach(dataNode => {
            const dataContext = this.executionContexts.get(dataNode.id);
            const label = dataNode.data.label || 'data';
            if (dataContext?.result) {
              inputs[`data:${label}`] = dataContext.result;
            } else if (dataNode.data.content) {
              inputs[`data:${label}`] = dataNode.data.content as string;
            }
          });
        }
      } else {
        // For non-data nodes (prompt, input, etc)
        let nodeResult: string | undefined;

        // First check execution context for a result
        if (context?.result) {
          nodeResult = context.result;
        }
        // For input nodes, fallback to content if no result
        else if (inputNode.type === 'input' && inputNode.data.content) {
          nodeResult = typeof inputNode.data.content === 'string' 
            ? inputNode.data.content 
            : undefined;
        }
        // For prompt nodes, ensure we get their latest result
        else if (inputNode.type === 'prompt' && context?.metadata?.executionResult) {
          nodeResult = context.metadata.executionResult;
        }

        if (nodeResult) {
          const edge = this.edges.find(e => 
            e.source === inputNode.id && e.target === nodeId
          );
          // Use a more descriptive key based on the source node type
          const key = edge?.sourceHandle || `${inputNode.type}-${inputNode.data.label || 'output'}`;
          inputs[key] = nodeResult;
        }
      }
    });

    return inputs;
  }

  /**
   * Executes a node and its downstream nodes
   */
  async executeNode(nodeId: string, initialInput?: string): Promise<NodeExecutionResult> {
    console.log('🎮 Executing Flow:', { 
      nodeId,
      initialInput,
      nodes: this.nodes.map(n => ({
        id: n.id,
        type: n.type,
        label: n.data.label,
        content: n.data.content
      }))
    });
    
    const node = this.nodes.find(n => n.id === nodeId);
    if (!node) {
      const error = {
        message: `Node ${nodeId} not found`,
        code: 'NODE_NOT_FOUND',
        details: {
          statusCode: 404,
          code: 'NodeNotFound'
        }
      };
      console.error('❌ Node not found:', error);
      throw error;
    }

    // Only reset state if this is the start of a new execution (input node)
    if (node.type === 'input') {
      // Get all nodes that will be part of this execution
      const executionPath = new Set<string>();
      const traverse = (currentId: string) => {
        if (executionPath.has(currentId)) return;
        executionPath.add(currentId);
        const outputNodes = this.getOutputNodes(currentId);
        outputNodes.forEach(n => traverse(n.id));
      };
      traverse(nodeId);

      // Reset only nodes that will be part of this execution, excluding output nodes
      executionPath.forEach(pathNodeId => {
        const pathNode = this.nodes.find(n => n.id === pathNodeId);
        if (pathNode && pathNode.type !== 'output') {
          this.updateNodeState(pathNodeId, {
            status: 'idle',
            result: undefined,
            error: undefined,
            metadata: {
              startTime: Date.now()
            }
          });
        }
      });
    }

    // Update current node to running state
    this.updateNodeState(nodeId, {
      status: 'running',
      metadata: {
        startTime: Date.now()
      }
    });

    try {
      // For input nodes with initial input
      if (node.type === 'input') {
        console.log('📥 Executing input node:', { 
          nodeId,
          initialInput,
          nodeContent: node.data.content
        });
        
        const inputContent = initialInput !== undefined 
          ? initialInput 
          : (typeof node.data.content === 'string' ? node.data.content : '');
        
        if (!inputContent) {
          const error = {
            message: 'No content available for input node',
            code: 'NO_CONTENT',
            details: { 
              statusCode: 400, 
              code: 'NoContent'
            }
          };
          this.updateNodeState(nodeId, {
            status: 'error',
            error,
            metadata: {
              startTime: Date.now(),
              endTime: Date.now()
            }
          });
          return {
            success: false,
            nodeId,
            error
          };
        }

        const executionContext = {
          nodeId,
          inputs: {},
          status: 'running' as const,
          result: inputContent
        };
        
        this.executionContexts.set(nodeId, executionContext);
        
        const result = await FlowExecutor.executeFlow(node, executionContext, inputContent);
        
        if (result.success) {
          const now = Date.now();
          const finalResult = {
            ...result,
            result: result.result || inputContent
          };
          
          this.updateNodeState(nodeId, {
            status: 'complete',
            result: finalResult.result,
            metadata: {
              startTime: now,
              endTime: now,
              processingTimeMs: result.metadata?.processingTimeMs,
              usage: result.metadata?.usage,
              lastExecutionTime: now,
              executionResult: finalResult.result
            }
          });

          // Execute downstream nodes and wait for them to complete
          await this.executeDownstreamNodes(nodeId);
          return finalResult;
        } else {
          this.updateNodeState(nodeId, {
            status: 'error',
            error: result.error,
            metadata: {
              startTime: Date.now(),
              endTime: Date.now()
            }
          });
          return result;
        }
      }
      // For other nodes
      else if (!this.isNodeReady(nodeId)) {
        console.warn('⚠️ Node not ready - waiting for inputs:', nodeId);
        const inputNodes = this.getInputNodes(nodeId);
        const waitingForInputs = inputNodes
          .filter(node => {
            const context = this.executionContexts.get(node.id);
            return context?.status !== 'complete';
          })
          .map(node => node.id);

        const error = {
          message: 'Node not ready - waiting for inputs',
          code: 'NOT_READY',
          details: { 
            statusCode: 400, 
            code: 'InputsNotReady'
          }
        };

        this.updateNodeState(nodeId, {
          status: 'running',
          error,
          metadata: {
            startTime: Date.now(),
            waitingForInputs
          }
        });

        return {
          success: false,
          nodeId,
          error
        };
      }
      else {
        const context: ExecutionContext = {
          nodeId,
          inputs: this.getNodeInputs(nodeId),
          status: 'running'
        };
        
        const result = await FlowExecutor.executeFlow(node, context);
        const now = Date.now();

        if (result.success) {
          this.updateNodeState(nodeId, {
            status: 'complete',
            result: result.result,
            metadata: {
              startTime: now,
              endTime: now,
              processingTimeMs: result.metadata?.processingTimeMs,
              usage: result.metadata?.usage,
              lastExecutionTime: now,
              executionResult: result.result
            }
          });

          // Execute downstream nodes and wait for them to complete
          await this.executeDownstreamNodes(nodeId);
          return result;
        } else {
          this.updateNodeState(nodeId, {
            status: 'error',
            error: result.error,
            metadata: {
              startTime: now,
              endTime: now,
              processingTimeMs: result.metadata?.processingTimeMs,
              lastExecutionTime: now
            }
          });
          return result;
        }
      }
    } catch (error: any) {
      const defaultError = {
        message: error.message || 'Unknown error occurred',
        code: error.code || 'EXECUTION_ERROR',
        details: {
          statusCode: error.statusCode || 500,
          code: error.code || 'UnknownError'
        }
      };

      this.updateNodeState(nodeId, {
        status: 'error',
        error: defaultError,
        metadata: {
          startTime: Date.now(),
          endTime: Date.now()
        }
      });

      return {
        success: false,
        nodeId,
        error: defaultError
      };
    }
  }

  /**
   * Executes all downstream nodes
   */
  private async executeDownstreamNodes(nodeId: string) {
    const outputNodes = this.getOutputNodes(nodeId);
    const sourceContext = this.executionContexts.get(nodeId);
    
    const results = await Promise.all(
      outputNodes.map(async node => {
        // For data nodes, update their execution context with upstream result first
        if (node.type === 'data' && sourceContext?.result) {
          this.updateNodeState(node.id, {
            status: 'complete',
            result: sourceContext.result,
            metadata: {
              startTime: Date.now(),
              endTime: Date.now(),
              processingTimeMs: 0,
              executionResult: sourceContext.result
            }
          });
        }
        
        // For output nodes, only execute if they're in the direct path
        if (node.type === 'output') {
          const currentContext = this.executionContexts.get(node.id);
          // Only execute if we have new inputs and the node is ready
          if (this.isNodeReady(node.id) && this.hasNewInputs(node.id)) {
            const result = await this.executeNode(node.id);
            if (result.success) {
              this.updateNodeState(node.id, {
                status: 'complete',
                result: result.result,
                metadata: {
                  startTime: Date.now(),
                  endTime: Date.now(),
                  processingTimeMs: result.metadata?.processingTimeMs,
                  usage: result.metadata?.usage,
                  lastExecutionTime: Date.now(),
                  executionResult: result.result,
                  executionMetadata: result.metadata
                }
              });
            }
            return result;
          }
          // Otherwise preserve current state
          return {
            success: true,
            nodeId: node.id,
            result: currentContext?.result
          };
        }
        
        // For other nodes, execute normally
        const result = await this.executeNode(node.id);
        const resultValue = result.success && typeof result.result === 'object' && 
          (result.result as any)?.result !== undefined
          ? (result.result as any).result
          : result.result;

        this.updateNodeState(node.id, {
          status: result.success ? 'complete' : 'error',
          result: resultValue,
          error: result.error,
          metadata: {
            startTime: Date.now(),
            endTime: Date.now(),
            processingTimeMs: result.metadata?.processingTimeMs,
            usage: result.metadata?.usage,
            lastExecutionTime: Date.now(),
            executionResult: resultValue,
            executionMetadata: result.metadata
          }
        });
        return result;
      })
    );
    return results;
  }

  private updateNodeState(nodeId: string, state: ExecutionState) {
    const existingContext = this.executionContexts.get(nodeId);
    const now = Date.now();
    
    const metadata: ExecutionMetadata = {
      startTime: state.metadata?.startTime || existingContext?.metadata?.startTime || now,
      endTime: state.metadata?.endTime || existingContext?.metadata?.endTime,
      processingTimeMs: state.metadata?.processingTimeMs || existingContext?.metadata?.processingTimeMs,
      usage: state.metadata?.usage || existingContext?.metadata?.usage,
      lastExecutionTime: state.metadata?.lastExecutionTime || existingContext?.metadata?.lastExecutionTime,
      waitingForInputs: state.metadata?.waitingForInputs,
      executionResult: state.metadata?.executionResult || existingContext?.metadata?.executionResult,
      executionMetadata: state.metadata?.executionMetadata || existingContext?.metadata?.executionMetadata
    };

    // Preserve existing inputs and result if not explicitly being updated
    const newContext = {
      nodeId,
      inputs: existingContext?.inputs || {},
      status: state.status,
      result: state.result !== undefined ? state.result : existingContext?.result,
      error: state.error,
      metadata
    };

    // For completed nodes, store current inputs for future comparison
    if (state.status === 'complete') {
      newContext.inputs = this.getNodeInputs(nodeId);
    }

    this.executionContexts.set(nodeId, newContext);
    
    if (this.stateUpdateCallback) {
      this.stateUpdateCallback(nodeId, {
        ...state,
        result: newContext.result,
        metadata
      });
    }
  }

  /**
   * Sets the callback for state updates
   */
  setStateUpdateCallback(callback: (nodeId: string, state: ExecutionState) => void) {
    this.stateUpdateCallback = callback;
  }

  /**
   * Gets the execution context for a node
   */
  getNodeContext(nodeId: string): ExecutionContext | undefined {
    return this.executionContexts.get(nodeId);
  }

  /**
   * Gets all downstream nodes that this node feeds into
   */
  getDownstreamNodes(nodeId: string): Node<BaseNodeData>[] {
    return this.getOutputNodes(nodeId);
  }

  /**
   * Gets all downstream nodes recursively
   */
  private getAllDownstreamNodes(nodeId: string, visited = new Set<string>()): Node<BaseNodeData>[] {
    if (visited.has(nodeId)) return [];
    visited.add(nodeId);

    const directDownstream = this.getOutputNodes(nodeId);
    const furtherDownstream = directDownstream.flatMap(node => 
      this.getAllDownstreamNodes(node.id, visited)
    );

    return [...directDownstream, ...furtherDownstream];
  }

  /**
   * Checks if a node has new inputs compared to its last execution
   */
  private hasNewInputs(nodeId: string): boolean {
    const currentInputs = this.getNodeInputs(nodeId);
    const context = this.executionContexts.get(nodeId);
    
    // If no previous inputs, consider it as having new inputs
    if (!context?.inputs) return true;

    // Compare current inputs with stored inputs
    return JSON.stringify(currentInputs) !== JSON.stringify(context.inputs);
  }
} 