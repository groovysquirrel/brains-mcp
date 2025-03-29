/**
 * syntaxParser.ts
 * Handles parsing and conversion of the custom model syntax into ReactFlow compatible format.
 */

import { Node, Edge } from 'reactflow';
import { MarkerType } from 'reactflow';

// ===============================
// Types
// ===============================

interface ParseResult {
  nodes: Node[];
  edges: Edge[];
}

interface ModelMetadata {
  type: string;
  title: string;
}

interface SubcomponentNode {
  id: string;
  label: string;
  shortId: string;
  parentId?: string;
  tooltip?: string;
}

interface Subcomponent {
  id: string;
  name: string;
  color: string;
  nodes: SubcomponentNode[];
  subcomponents: Subcomponent[];
  parentId?: string;
  level: number;
}

interface ParsedModel {
  metadata: ModelMetadata;
  subcomponents: Subcomponent[];
  edges: string[];
  standaloneNodes: SubcomponentNode[];
}

// ===============================
// Parser Core
// ===============================

class ModelParser {
  private lines: string[];
  private currentIndex: number;

  constructor(input: string) {
    this.lines = input.split('\n').map(line => line.trim());
    this.currentIndex = 0;
  }

  parseModel(): ParsedModel {
    // Validate model header
    if (!this.lines[0].startsWith('model')) {
      throw new Error('Model must start with "model" keyword');
    }

    // Get metadata
    const metadata = this.parseMetadata();
    
    // Parse all top-level subcomponents and nodes
    const subcomponents: Subcomponent[] = [];
    const edges: string[] = [];
    const standaloneNodes: SubcomponentNode[] = [];

    while (this.currentIndex < this.lines.length) {
      const line = this.lines[this.currentIndex].trim();
      if (line.startsWith('subcomponent')) {
        subcomponents.push(this.parseSubcomponent());
      } else if (line.includes('->') || line.includes('--') || line.includes('<-')) {
        edges.push(line);
        this.currentIndex++;
      } else if (line.includes(':')) {
        const shortId = line.split(':')[0].trim();
        const detailMatch = line.match(/\[detail="([^"]+)"\]/);
        
        // Extract everything after the colon, before any attributes
        let label = line.split(':')[1].trim();
        // Remove any attributes like [detail="..."]
        label = label.replace(/\[detail="[^"]+"\]/, '').trim();
        // Remove quotes if they exist (do this last)
        label = label.replace(/^"(.*)"$/, '$1');

        standaloneNodes.push({
          id: `node_${shortId}_0`,
          label: label,
          shortId,
          tooltip: detailMatch ? detailMatch[1] : undefined
        });
        this.currentIndex++;
      } else {
        this.currentIndex++;
      }
    }

    return { metadata, subcomponents, edges, standaloneNodes };
  }

  private parseMetadata(): ModelMetadata {
    const modelMatch = this.lines[0].match(/model\s+(\w+)/);
    const titleLine = this.lines[1];
    const titleMatch = titleLine.match(/title="([^"]+)"/);

    if (!modelMatch || !titleMatch) {
      throw new Error('Invalid model metadata');
    }

    this.currentIndex = 2; // Move past metadata
    return {
      type: modelMatch[1],
      title: titleMatch[1]
    };
  }

  private parseSubcomponent(parentId?: string, level: number = 0): Subcomponent {
    const line = this.lines[this.currentIndex];
    const nameMatch = line.match(/subcomponent\s+(?:"([^"]+)"|(\w+))(?:\[color="([^"]+)"\])?/);
    
    if (!nameMatch) {
      throw new Error(`Invalid subcomponent format: ${line}`);
    }

    const name = nameMatch[1] || nameMatch[2];
    const color = nameMatch[3] || 'rgba(240, 240, 240, 0.5)';
    const id = `sc_${name.replace(/\s+/g, '_')}_${level}`;

    const subcomponent: Subcomponent = {
      id,
      name,
      color,
      nodes: [],
      subcomponents: [],
      parentId,
      level
    };

    this.currentIndex++; // Move past subcomponent declaration
    
    // Skip opening brace
    if (this.lines[this.currentIndex].includes('{')) {
      this.currentIndex++;
    }

    // Parse content until closing brace
    while (this.currentIndex < this.lines.length) {
      const currentLine = this.lines[this.currentIndex];

      if (currentLine.includes('}')) {
        this.currentIndex++;
        break;
      }

      if (currentLine.startsWith('subcomponent')) {
        // Recursive call for nested subcomponent
        subcomponent.subcomponents.push(
          this.parseSubcomponent(subcomponent.id, level + 1)
        );
      } else if (currentLine.includes('"')) {
        // Parse node
        this.parseNode(currentLine, subcomponent);
        this.currentIndex++;
      } else {
        this.currentIndex++;
      }
    }

    return subcomponent;
  }

  private parseNode(line: string, parent: Subcomponent): void {
    const labelMatch = line.match(/"([^"]+)"/);
    const detailMatch = line.match(/\[detail="([^"]+)"\]/);
    
    if (!labelMatch) return;

    const label = labelMatch[1];
    const shortId = label.split(':')[0].trim();
    const tooltip = detailMatch ? detailMatch[1] : undefined;
    
    parent.nodes.push({
      id: `node_${shortId}_${parent.level}`,
      label,
      shortId,
      parentId: parent.id,
      tooltip
    });
  }
}

// ===============================
// React Flow Conversion
// ===============================

class FlowConverter {
  private nodes: Node[] = [];
  private edges: Edge[] = [];
  private currentY = 0;


  convert(model: ParsedModel): ParseResult {
    this.nodes = [];
    this.edges = [];
    this.currentY = 50;  // Start with some padding

    // Create standalone nodes
    model.standaloneNodes.forEach((node, index) => {
      this.nodes.push({
        id: node.id,
        type: 'tooltipNode',
        position: { 
          x: 50 + (index * 250),  // Space them horizontally
          y: this.currentY 
        },
        data: { 
          label: node.label,
          tooltip: node.tooltip
        },
        draggable: true
      });
    });

    // Add spacing before subcomponents
    this.currentY += 200;

    // Process subcomponents and edges as before
    this.processSubcomponents(model.subcomponents);
    this.processEdges(model.edges);

    return {
      nodes: this.nodes,
      edges: this.edges
    };
  }

  private processSubcomponents(subcomponents: Subcomponent[], _parentIndex: number = 0): void {
    subcomponents.forEach((subcomponent, index) => {
      // Create group node
      this.nodes.push(this.createGroupNode(subcomponent, index));

      // Create content nodes
      subcomponent.nodes.forEach((node, nodeIndex) => {
        this.nodes.push(this.createContentNode(node, nodeIndex, subcomponent.nodes.length));
      });

      // Process nested subcomponents recursively
      if (subcomponent.subcomponents.length > 0) {
        // Add parentNode property to nested subcomponents
        const nestedNodes = this.processNestedSubcomponents(subcomponent.subcomponents, subcomponent.id);
        this.nodes.push(...nestedNodes);
      }
    });
  }

  private processNestedSubcomponents(subcomponents: Subcomponent[], parentId: string): Node[] {
    const nodes: Node[] = [];
    
    subcomponents.forEach((subcomponent, index) => {
      // Create group node with parent reference
      const groupNode = this.createGroupNode(subcomponent, index);
      groupNode.parentNode = parentId;
      groupNode.extent = 'parent';
      nodes.push(groupNode);

      // Create content nodes
      subcomponent.nodes.forEach((node, nodeIndex) => {
        nodes.push(this.createContentNode(node, nodeIndex, subcomponent.nodes.length));
      });

      // Recursively process deeper nesting
      if (subcomponent.subcomponents.length > 0) {
        const nestedNodes = this.processNestedSubcomponents(subcomponent.subcomponents, subcomponent.id);
        nodes.push(...nestedNodes);
      }
    });

    return nodes;
  }

  private VERTICAL_SPACING = 50;

  private createGroupNode(subcomponent: Subcomponent, _index: number): Node {
    const width = Math.max(300, subcomponent.nodes.length * 220);
    const height = Math.max(100, this.calculateNestedHeight(subcomponent));
    
    const node: Node = {
      id: subcomponent.id,
      type: 'group',
      position: { 
        x: 50,  // Fixed X position with small offset from left
        y: this.currentY 
      },
      data: { 
        label: subcomponent.name,
        color: subcomponent.color
      },
      style: { 
        width,
        height,
        padding: 20
      }
    };

    // Update Y position for next node
    this.currentY += height + this.VERTICAL_SPACING;

    return node;
  }

  private calculateNestedHeight(subcomponent: Subcomponent): number {
    const BASE_HEIGHT = 100;
    const NESTED_PADDING = 100;
    
    if (subcomponent.subcomponents.length === 0) {
      return BASE_HEIGHT;
    }

    const nestedHeights = subcomponent.subcomponents.map(sub => 
      this.calculateNestedHeight(sub)
    );

    return BASE_HEIGHT + Math.max(...nestedHeights) + NESTED_PADDING;
  }

  private createContentNode(node: SubcomponentNode, index: number, _totalNodes: number): Node {
    return {
      id: node.id,
      type: 'default',
      position: { x: 50 + (index * 200), y: 10 },
      data: { 
        label: node.label,
        tooltip: node.tooltip
      },
      parentNode: node.parentId,
      extent: 'parent',
      draggable: true
    };
  }

  private processEdges(edgeStrings: string[]): void {
    edgeStrings.forEach((edge, index) => {
      let source: string = '', target: string = '';
      let markerEnd: { type: MarkerType } | undefined = undefined;
      
      // Extract parameters first
      const paramMatch = edge.match(/\[type=(\w+)\]/);
      const edgeType = paramMatch ? paramMatch[1] : 'default';
      
      // Clean the edge string by removing parameters
      const cleanEdge = edge.replace(/\[.*?\]/, '').trim();
      
      console.log('Processing edge:', { original: edge, cleaned: cleanEdge });

      if (cleanEdge.includes('->')) {
        [source, target] = cleanEdge.split('->');
      } else if (cleanEdge.includes('--')) {
        [source, target] = cleanEdge.split('--');
      } else if (cleanEdge.includes('<-')) {
        [target, source] = cleanEdge.split('<-');
      }

      source = source.trim();
      target = target.trim();

      console.log('Found nodes:', { source, target });

      // Find the actual source and target nodes
      const sourceNode = this.nodes.find(n => n.id.startsWith(`node_${source}_`));
      const targetNode = this.nodes.find(n => n.id.startsWith(`node_${target}_`));

      console.log('Node lookup:', { 
        sourceFound: !!sourceNode, 
        targetFound: !!targetNode,
        sourceId: sourceNode?.id,
        targetId: targetNode?.id
      });

      if (sourceNode && targetNode) {
        this.edges.push({
          id: `edge_${index}`,
          source: sourceNode.id,
          target: targetNode.id,
          markerEnd,
          animated: false,
          type: edgeType,
        });
      }
    });
  }
}

// ===============================
// Main Export
// ===============================

export function parseSyntax(input: string): ParseResult {
  const parser = new ModelParser(input);
  const model = parser.parseModel();
  
  const converter = new FlowConverter();
  return converter.convert(model);
}