import graphlib from '@dagrejs/graphlib';

interface ParsedGraph {
  type: string;
  children: Array<{
    type: string;
    node_id?: { id: string };
    edge_list?: Array<{ id: string }>;
    attr_list?: Array<{ id: string; eq: string }>;
  }>;
}

declare class DotGraph {
  constructor(dotSrc: string);
  
  dotSrc: string;
  parsedGraph: ParsedGraph | null;
  graph: graphlib.Graph;
  
  parse(): void;
  getGraph(): graphlib.Graph;
  getParsedGraph(): ParsedGraph | null;
  getDotSrc(): string;
}

export default DotGraph;