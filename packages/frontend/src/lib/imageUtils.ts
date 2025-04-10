export interface DiagramImage {
  src: string;
  alt: string;
  caption?: string;
  filename: string;
}

/**
 * Returns the full path to an image in the public/diagrams directory
 */
export function getDiagramImagePath(filename: string): string {
  return `/diagrams/${filename}`;
}

/**
 * Provides an array of diagram images from the public/diagrams directory
 */
export function getDiagramImages(): DiagramImage[] {
  // Define the diagrams we know about
  return [
    {
      filename: 'llm-gateway.png',
      src: getDiagramImagePath('llm-gateway.png'),
      alt: 'LLM Gateway Architecture',
      caption: 'LLM Gateway Architecture'
    },
    {
      filename: 'mcp-architecture-v2.png',
      src: getDiagramImagePath('mcp-architecture-v2.png'),
      alt: 'MCP Architecture',
      caption: 'BRAINS OS MCP Architecture'
    }
  ];
} 