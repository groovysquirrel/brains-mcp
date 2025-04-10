import { NodeProps } from 'reactflow';
import { BaseNodeData, PromptNodeData } from '../../types';
import InputNode from './input/InputNode';
import OutputNode from './output/OutputNode';
import DataNode from './data/DataNode';
import PromptNode from './prompt/PromptNode';

// Type for the node types mapping
export type NodeTypes = {
  input: React.ComponentType<NodeProps<BaseNodeData>>;
  prompt: React.ComponentType<NodeProps<PromptNodeData>>;
  output: React.ComponentType<NodeProps<BaseNodeData>>;
  data: React.ComponentType<NodeProps<BaseNodeData>>;
};

// Simple mapping of node types to their components
export const NODE_TYPES: NodeTypes = {
  input: InputNode,
  prompt: PromptNode,
  output: OutputNode,
  data: DataNode
};
