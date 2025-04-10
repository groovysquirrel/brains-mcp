import { parse as graphvizParse } from '@ts-graphviz/parser';
import graphlib from '@dagrejs/graphlib';

export const parse = (dotSrc) => {
  const result = graphvizParse(dotSrc);
  // Ensure we return an array to match the sample code's expected format
  return Array.isArray(result) ? result : [result];
};

export default class DotGraph {
  constructor(dotSrc) {
    this.dotSrc = dotSrc;
    this.parsedGraph = null;
    this.graph = new graphlib.Graph({ directed: true });
    this.parse();
  }

  parse() {
    try {
      this.parsedGraph = parse(this.dotSrc);
      
      // Clear existing graph
      this.graph = new graphlib.Graph({ directed: true });
      
      // Set graph attributes
      if (this.parsedGraph.type === 'digraph') {
        this.graph.setGraph({ directed: true });
      }

      // Add nodes and edges from parsed graph
      if (this.parsedGraph.children) {
        this.parsedGraph.children.forEach(child => {
          if (child.type === 'node_stmt') {
            const nodeId = child.node_id.id;
            const attrs = {};
            
            if (child.attr_list) {
              child.attr_list.forEach(attr => {
                attrs[attr.id] = attr.eq;
              });
            }
            
            this.graph.setNode(nodeId, attrs);
          }
          else if (child.type === 'edge_stmt') {
            const edgeIds = child.edge_list.map(edge => edge.id);
            for (let i = 0; i < edgeIds.length - 1; i++) {
              const attrs = {};
              
              if (child.attr_list) {
                child.attr_list.forEach(attr => {
                  attrs[attr.id] = attr.eq;
                });
              }
              
              this.graph.setEdge(edgeIds[i], edgeIds[i + 1], attrs);
            }
          }
        });
      }

    } catch (error) {
      if (error.location) {
        error.message = `Syntax error at line ${error.location.start.line}: ${error.message}`;
      }
      throw error;
    }
  }

  getGraph() {
    return this.graph;
  }

  getParsedGraph() {
    return this.parsedGraph;
  }

  getDotSrc() {
    return this.dotSrc;
  }
}
