import { marked, Token, Tokens } from 'marked';
import { 
  CapabilityType, 
  ITRGObject, 
  ValueStream, 
  Level1Capability,
  ColorMarker,
  ColorType
} from './itrg-bra';
import { Transformer } from '../../../../types/core/Transformer';

/**
 * Transformer for converting ITRG-BRA markdown to object format
 */
export const itrg_bra_markdownToObjectTransformer: Transformer = {
  config: {
    name: 'itrg-bra-markdown-to-object',
    description: 'Converts ITRG-BRA markdown to object format',
    version: '1.0.0',
    objectType: 'itrg-bra',
    fromView: 'markdown',
    toView: 'object'
  },
  transform: async (input: string) => {
    try {
      const result = parseMarkdown(input);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  validate: async (input: string) => {
    return Promise.resolve(input.trim().length > 0);
  }
};

// Helper function to parse the legend section
function parseLegend(content: string): { [key in ColorMarker]?: ColorType } {
  const legend: { [key in ColorMarker]?: ColorType } = {};
  const lines = content.split('\n');
  let inLegend = false;

  for (const line of lines) {
    if (line.trim() === '---') {
      inLegend = true;
      continue;
    }
    if (inLegend) {
      // Handle both formats: "*=red" and "* = red"
      const match = line.match(/^(\*+)\s*=\s*(\w+)\s*$/);
      if (match) {
        const [, marker, color] = match;
        legend[marker as ColorMarker] = color;
      }
    }
  }

  return legend;
}

// Helper function to clean text content
function cleanText(text: string): string {
  // Remove extra spaces, including indentation
  return text.replace(/^\s+/gm, '').trim();
}

// Helper function to extract color marker from text
function extractColorMarker(text: string): { text: string; colorMarker?: ColorMarker } {
  const match = text.match(/^(.*?)(\*{1,5})$/);
  if (!match) {
    return { text };
  }
  return {
    text: match[1].trim(),
    colorMarker: match[2] as ColorMarker
  };
}

// Helper function to remove prefixes, bold syntax, and split name/description
function parseHeading(text: string, legend: { [key in ColorMarker]?: ColorType }): { 
  name: string; 
  description?: string;
  color?: ColorType;
} {
  // Extract color marker first
  const { text: cleanText, colorMarker } = extractColorMarker(text);

  // Remove bold syntax
  let cleaned = cleanText.replace(/\*\*/g, '');
  
  // Split into name and description if there's a colon followed by space
  const parts = cleaned.split(': ');
  
  // Handle different formats:
  // 1. "L1: Title: Description"
  // 2. "L1: Title" (no description)
  // 3. "VS1: Title: Description"
  let name, description;
  
  if (parts[0].match(/^(VS\d+|L[12])$/)) {
    // If first part is just the prefix, take the second part as name
    name = parts[1] || '';
    description = parts.slice(2).join(': ').trim();
  } else {
    // Otherwise, remove prefix from first part
    name = parts[0]
      .replace(/^VS\d+:\s*/, '')
      .replace(/^L[12]:\s*/, '')
      .trim();
    description = parts.slice(1).join(': ').trim();
  }
  
  return {
    name,
    description: description || undefined,
    color: colorMarker ? legend[colorMarker] : undefined
  };
}

// Helper function to parse the colors section
function parseColors(content: string): { [key in ColorMarker]?: ColorType } {
  const colors: { [key in ColorMarker]?: ColorType } = {};
  const lines = content.split('\n');
  let inColors = false;

  for (const line of lines) {
    if (line.trim() === '<colors>') {
      inColors = true;
      continue;
    }
    if (line.trim() === '</colors>') {
      inColors = false;
      continue;
    }
    if (inColors) {
      // Handle both formats: "*=red" and "* = red"
      const match = line.match(/^(\*+)\s*=\s*(\w+)\s*$/);
      if (match) {
        const [, marker, color] = match;
        colors[marker as ColorMarker] = color;
      }
    }
  }

  return colors;
}

// Helper function to parse the layout section
function parseLayout(content: string): string[] {
  const layout: string[] = [];
  const lines = content.split('\n');
  let inLayout = false;

  for (const line of lines) {
    if (line.trim() === '<layout>') {
      inLayout = true;
      continue;
    }
    if (line.trim() === '</layout>') {
      inLayout = false;
      continue;
    }
    if (inLayout && line.trim()) {
      layout.push(line.trim());
    }
  }

  return layout;
}

export function parseMarkdown(content: string): ITRGObject {
  // Parse colors and layout sections first
  const colors = parseColors(content);
  const layout = parseLayout(content);

  // Remove the colors and layout sections from the content
  let mainContent = content
    .replace(/<colors>[\s\S]*?<\/colors>/g, '')
    .replace(/<layout>[\s\S]*?<\/layout>/g, '')
    .trim();

  // Preprocess the main content
  const processedContent = cleanText(mainContent
    .replace(/\\n/g, '\n')
    .replace(/\\\\/g, '\\'));

  console.log('Preprocessed content:', processedContent);
  const tokens = marked.lexer(processedContent);
  
  const result: ITRGObject = {
    definingCapabilities: { valueStreams: [] },
    sharedCapabilities: [],
    enablingCapabilities: [],
    legend: Object.keys(colors).length > 0 ? colors : undefined,
    layout: layout.length > 0 ? layout : undefined
  };

  // Track seen L1 capabilities to handle duplicates
  const seenL1s = new Set<string>();

  let currentSection: CapabilityType = 'Defining'; // Default to Defining for VS sections
  let currentValueStream: ValueStream | null = null;
  let currentL1Capability: Level1Capability | null = null;
  let lastProcessedEntity: { type: 'vs' | 'l1' | 'l2', entity: any } | null = null;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    
    if (token.type === 'heading') {
      const headingToken = token as Tokens.Heading;
      const headingText = headingToken.text.trim();
      console.log(`Processing heading: ${headingText} (depth: ${headingToken.depth})`);

      // First check if this is a value stream heading
      if (headingText.match(/^[\*]*VS\d+:/)) {
        currentSection = 'Defining';
        currentValueStream = null;
        const { name, description, color } = parseHeading(headingText, colors);
        console.log(`Creating value stream: ${name}`);
        currentValueStream = {
          name,
          description,
          color,
          level1Capabilities: []
        };
        result.definingCapabilities.valueStreams.push(currentValueStream);
        lastProcessedEntity = { type: 'vs', entity: currentValueStream };
        continue;
      }

      switch (headingToken.depth) {
        case 1:
          // Reset section based on heading
          if (headingText.toLowerCase().includes('shared capabilities')) {
            currentSection = 'Shared';
            currentValueStream = null;
            seenL1s.clear(); // Reset seen L1s for new section
          } else if (headingText.toLowerCase().includes('enabling capabilities')) {
            currentSection = 'Enabling';
            currentValueStream = null;
            seenL1s.clear(); // Reset seen L1s for new section
          }
          lastProcessedEntity = null;
          break;

        case 2:
          if (currentSection === 'Enabling' || currentSection === 'Shared') {
            // Handle L1 capabilities in Enabling/Shared sections
            const { name, description, color } = parseHeading(headingText, colors);
            
            // Skip duplicates
            if (seenL1s.has(name)) {
              console.log(`Skipping duplicate L1 capability: ${name}`);
              continue;
            }
            seenL1s.add(name);
            
            console.log(`Creating L1 capability: ${name} in section ${currentSection}`);
            
            const l1Capability: Level1Capability = {
              name,
              description,
              color,
              level2Capabilities: []
            };

            if (currentSection === 'Shared') {
              result.sharedCapabilities.push(l1Capability);
            } else {
              result.enablingCapabilities.push(l1Capability);
            }
            currentL1Capability = l1Capability;
            lastProcessedEntity = { type: 'l1', entity: l1Capability };
          }
          break;

        case 3:
          // Handle L1 capabilities in Defining section and L2 in other sections
          if (headingText.match(/^[\*]*L1:/)) {
            const { name, description, color } = parseHeading(headingText, colors);
            console.log(`Creating L1 capability: ${name} in section ${currentSection}`);
            
            const l1Capability: Level1Capability = {
              name,
              description,
              color,
              level2Capabilities: []
            };

            if (currentSection === 'Defining' && currentValueStream) {
              currentValueStream.level1Capabilities.push(l1Capability);
            }
            currentL1Capability = l1Capability;
            lastProcessedEntity = { type: 'l1', entity: l1Capability };
          } else if (headingText.match(/^[\*]*L2:/) && currentL1Capability) {
            const { name, description, color } = parseHeading(headingText, colors);
            console.log(`Creating L2 capability: ${name}`);
            const l2Capability = {
              name,
              description,
              color
            };
            currentL1Capability.level2Capabilities.push(l2Capability);
            lastProcessedEntity = { type: 'l2', entity: l2Capability };
          }
          break;

        case 4:
          // Handle L2 capabilities
          if (headingText.match(/^[\*]*L2:/) && currentL1Capability) {
            const { name, description, color } = parseHeading(headingText, colors);
            console.log(`Creating L2 capability: ${name}`);
            const l2Capability = {
              name,
              description,
              color
            };
            currentL1Capability.level2Capabilities.push(l2Capability);
            lastProcessedEntity = { type: 'l2', entity: l2Capability };
          }
          break;
      }
    } else if (token.type === 'paragraph') {
      // Handle descriptions that follow headings
      const paragraphToken = token as Tokens.Paragraph;
      const description = cleanText(paragraphToken.text);
      
      if (lastProcessedEntity) {
        // If the entity doesn't have a description (from the heading), use the paragraph
        if (!lastProcessedEntity.entity.description) {
          lastProcessedEntity.entity.description = description;
        }
      }
    }
  }

  console.log('Final result:', JSON.stringify(result, null, 2));
  return result;
}

// Test function with sample input
export function testParser() {
  const sampleInput = `
# Value Streams

## VS1: Develop the Business
Focuses on strategic initiatives...

### L1: Conduct Market Research*
Description of red L1...

#### L2: Analyze Market Trends**
Description of orange L2...

# Enabling Capabilities

## L1: Data Analysis & Reporting***
Description of pink L1...

---
* = red
** = orange
*** = pink
  `;

  console.log('Testing parser with sample input...\n');
  const result = parseMarkdown(sampleInput);
  console.log('\nTest complete!');
}
