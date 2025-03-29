/**
 * Node Factory
 * 
 * This class is responsible for creating and configuring nodes in the flow system.
 * It ensures that all nodes are created with proper defaults and type safety.
 */

import { Node } from 'reactflow';
import { NodeType, HandleConfig } from '../types/flow';
import { Position, Dimensions } from '../types/common';
import type { BaseNodeData } from '../types/flow';

export class NodeFactory {
  /**
   * Default dimensions for each node type
   */
  private static readonly defaultDimensions: Record<NodeType, Dimensions> = {
    input: { 
      width: 280, 
      height: 200, 
      minWidth: 280, 
      minHeight: 200 
    },
    prompt: { 
      width: 400, 
      height: 400, 
      minWidth: 400, 
      minHeight: 400 
    },
    output: { 
      width: 320, 
      height: 370, 
      minWidth: 320, 
      minHeight: 370 
    },
    data: { 
      width: 280, 
      height: 250, 
      minWidth: 280, 
      minHeight: 250 
    }
  };

  /**
   * Get default dimensions for a node type
   */
  static getDefaultDimensions(type: NodeType): Dimensions {
    return this.defaultDimensions[type];
  }

  /**
   * Creates a new node of the specified type
   */
  static createNode(type: NodeType, id: string, position: Position): Node<BaseNodeData> {
    const baseData: BaseNodeData = {
      id,
      type,
      position,
      label: id,
      isCollapsed: false,
      collapsed: false,
      selected: false,
      status: 'idle',
      content: this.getInitialContent(type),
      metadata: {},
      dimensions: this.getDefaultDimensions(type),
      handles: this.getHandleConfig(type),
      onUpdate: (_nodeId: string, _updates: Partial<BaseNodeData>) => {},
      onRemove: (_nodeId: string) => {},
      onCollapse: () => {},
      onDelete: () => {}
    };

    return {
      id,
      type,
      position,
      data: {
        ...baseData
      },
      draggable: true,
      connectable: true,
      selectable: true
    };
  }

  /**
   * Get initial content for a node type
   */
  static getInitialContent(type: NodeType): any {
    switch (type) {
      case 'input':
      case 'output':
      case 'data':
        return '';
      case 'prompt':
        return {
          modelId: undefined,
          systemPrompt: '',
          input: undefined
        };
      default:
        return '';
    }
  }

  /**
   * Gets handle configuration for a node type
   */
  private static getHandleConfig(type: NodeType): { input?: HandleConfig[]; output?: HandleConfig[] } {
    const config = {
      input: [] as HandleConfig[],
      output: [] as HandleConfig[]
    };

    switch (type) {
      case 'input':
        config.output = [
          {
            id: 'output-right',
            type: 'source',
            position: 'right'
          },
          {
            id: 'output-bottom',
            type: 'source',
            position: 'bottom'
          }
        ];
        break;

      case 'prompt':
        config.input = [
          {
            id: 'input-top',
            type: 'target',
            position: 'top'
          },
          {
            id: 'input-left',
            type: 'target',
            position: 'left'
          }
        ];
        config.output = [
          {
            id: 'output-right',
            type: 'source',
            position: 'right'
          },
          {
            id: 'output-bottom',
            type: 'source',
            position: 'bottom'
          }
        ];
        break;

      case 'output':
        config.input = [
          {
            id: 'input-top',
            type: 'target',
            position: 'top'
          },
          {
            id: 'input-left',
            type: 'target',
            position: 'left'
          }
        ];
        break;

      case 'data':
        config.input = [
          {
            id: 'input-top',
            type: 'target',
            position: 'top'
          },
          {
            id: 'input-left',
            type: 'target',
            position: 'left'
          }
        ];
        config.output = [
          {
            id: 'output-right',
            type: 'source',
            position: 'right'
          },
          {
            id: 'output-bottom',
            type: 'source',
            position: 'bottom'
          }
        ];
        break;
    }

    // Only include non-empty arrays in the result
    const result: { input?: HandleConfig[]; output?: HandleConfig[] } = {};
    if (config.input.length > 0) result.input = config.input;
    if (config.output.length > 0) result.output = config.output;
    return result;
  }
}
