import { ITRGObject } from './itrg-bra';
import { Transformer } from '../TransformerTypes';

/**
 * Transformer for converting ITRG-BRA object to DOT graph format
 */
export const itrg_bra_objectToDotTransformer: Transformer = {
  config: {
    name: 'itrg-bra-object-to-dot',
    description: 'Converts ITRG-BRA object to DOT graph format',
    version: '1.0.0',
    objectType: 'itrg-bra',
    fromView: 'object',
    toView: 'dot'
  },
  transform: async (input: any) => {
    try {
      const result = generateDotGraph(input);
      return { success: true, data: result };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    }
  },
  validate: async (input: any) => {
    return Promise.resolve(input && typeof input === 'object');
  }
};

function formatLabel(label: string, isException: boolean = false): string {
  // Define alises
  const aliases: Record<string, string> = {
    'management': 'Mgmt.',
    'Management': 'Mgmt.',
    "Business": "Bus.",
    "Development": "Dev.",
    "\\band\\b": "&",
    "Information Technology": "IT",
    "Human Resources": "HR",
    "Marketing": "Mktg.",
    "Technology": "Tech."
  };  
  
  let processedLabel = label;
  Object.entries(aliases).forEach(([word, replacement]) => {
    processedLabel = processedLabel.replace(new RegExp(word, 'g'), replacement);
  });

  if (isException) {
    return label;
  }
  
  const words = processedLabel.split(' ');
  const midPoint = Math.ceil(words.length / 2);
  const firstLine = words.slice(0, midPoint).join(' ');
  const secondLine = words.slice(midPoint).join(' ');
  return `${firstLine}\\n${secondLine}`;
}

// Helper function to generate node style
function getNodeStyle(color?: string, isCluster: boolean = false): string {
  const baseStyle = 'filled';
  const baseFillColor = isCluster ? 'skyblue3' : 'lightskyblue';
  
  // For L1 clusters, we want to use the color as the background
  if (isCluster && color) {
    return `fillcolor="${color}" style="${baseStyle}"`;
  }
  
  // For regular nodes, only apply color if it's an L2 capability
  if (!isCluster && color) {
    return `style="${baseStyle}" fillcolor="${color}"`;
  }
  
  return `style="${baseStyle}" fillcolor="${baseFillColor}"`;
}

export function generateDotGraph(parsedContent: ITRGObject): string {
  let dotGraph = `
    digraph refArchitecture {
      node [fontname="Helvetica,Arial,sans-serif" width=2 height=0.8];
      edge [fontname="Helvetica,Arial,sans-serif"];
  `;

  let links = '';
  let definingLeftConnector = '';
  let definingRightConnector = '';
  let sharedFirstNode = 'shared_1_l2_1';
  let sharedLastNode = '';
  let enablingFirstNode = 'enabling_1';
  let enablingLastNode = '';

  // Calculate indices and totals once at the start
  const totalValueStreams = parsedContent.definingCapabilities.valueStreams.length;
  const middleVSIndex = Math.floor((totalValueStreams - 1) / 2);
  const middleVSNumber = middleVSIndex + 1;
  const totalSharedCapabilities = parsedContent.sharedCapabilities.length;
  const middleSharedIndex = Math.floor(totalSharedCapabilities / 2);
  const middleSharedLetter = String.fromCharCode(65 + middleSharedIndex);
  const totalEnabling = parsedContent.enablingCapabilities.length;
  // Calculate middle enabling number - ensure it's odd
  const middleEnablingNumber = Math.floor(totalEnabling / 2) + 1;
  const middleEnablingOdd = middleEnablingNumber % 2 === 0 ? middleEnablingNumber - 1 : middleEnablingNumber;

  dotGraph += `
    subgraph cluster_defining {
      bgcolor="lightsteelblue2";
      label="Defining Capabilities";
      tooltip="Capabilities linked to a specific value stream";
      labeljust=r;
      fontcolor="black";
      style=solid;
      fontname="Helvetica,Arial,sans-serif";
      ranksep=0.2;
      fontsize=12;
  `;

  parsedContent.definingCapabilities.valueStreams.forEach((valueStream, vsIndex) => {
    const vsNumber = vsIndex + 1;
    const isFirstVS = vsIndex === 0;
    const isLastVS = vsIndex === totalValueStreams - 1;

    dotGraph += `
      subgraph cluster_vs${vsNumber} {
        fillcolor="white";
        fontcolor="black";
        style="filled";
        label="${formatLabel(valueStream.name, true)}";
        tooltip="${valueStream.description || ''}";
        labeljust=c;
        fontsize=16;
        node [shape=box ${getNodeStyle()}];
    `;

    valueStream.level1Capabilities.forEach((l1Capability, l1Index) => {
      const l1Letter = String.fromCharCode(65 + l1Index); // A, B, C, etc.
      const isFirstL1 = l1Index === 0;
      const isLastL1 = l1Index === valueStream.level1Capabilities.length - 1;

      dotGraph += `
        subgraph cluster_vs${vsNumber}_l1${l1Letter} {
          ${getNodeStyle(l1Capability.color, true)};
          label="${formatLabel(l1Capability.name)}";
          fontcolor="black";
          node [shape=box ${getNodeStyle()}];
      `;

      l1Capability.level2Capabilities.forEach((l2Capability, l2Index) => {
        const l2Letter = String.fromCharCode(65 + l2Index); // A, B, C, etc.
        const nodeId = `vs${vsNumber}_l1${l1Letter}_l2${l2Letter}`;
        
        if (isFirstVS && isFirstL1 && l2Index === l1Capability.level2Capabilities.length - 1) {
          definingLeftConnector = nodeId;
        }
        if (isLastVS && isLastL1 && l2Index === l1Capability.level2Capabilities.length - 1) {
          definingRightConnector = nodeId;
        }

        dotGraph += `          ${nodeId} [label="${formatLabel(l2Capability.name)}" tooltip="${l2Capability.description || ''}" ${getNodeStyle(l2Capability.color)}];\n`;
      });

      for (let i = 1; i < l1Capability.level2Capabilities.length; i++) {
        const fromLetter = String.fromCharCode(65 + i - 1);
        const toLetter = String.fromCharCode(65 + i);
        const fromNodeId = `vs${vsNumber}_l1${l1Letter}_l2${fromLetter}`;
        const toNodeId = `vs${vsNumber}_l1${l1Letter}_l2${toLetter}`;
        dotGraph += `          ${fromNodeId} -> ${toNodeId} [style=invis];\n`;
      }

      dotGraph += '        }\n';
    });

    dotGraph += '      }\n';
  });

  dotGraph += '    }\n';

  // Create shared capabilities section
  dotGraph += `
    subgraph cluster_shared {
      bgcolor="grey86";
      label="Shared Capabilities";
      tooltip="Shared business capabilities that span across value streams";
      fontcolor="black";
      style=solid;
      fontname="Helvetica,Arial,sans-serif";
      fontsize=12;
      ranksep=0.2;
      rankdir=TB;
      labeljust=r;
  `;

  // Count total L2 capabilities across all shared L1s
  const totalSharedL2s = parsedContent.sharedCapabilities.reduce((total, l1) => 
    total + l1.level2Capabilities.length, 0);
  const shouldStackShared = totalSharedL2s > 8;

  // Keep track of all L2 nodes for stacking
  const allL2Nodes: string[] = [];

  parsedContent.sharedCapabilities.forEach((sharedCapability, index) => {
    const l1Letter = String.fromCharCode(65 + index);
    dotGraph += `
      subgraph cluster_shared_l1${l1Letter} {
        ${getNodeStyle(sharedCapability.color, true)};
        label="${formatLabel(sharedCapability.name, true)}";
        tooltip="${sharedCapability.description || ''}";
        fontcolor="black";
        labeljust=c;
        fontsize=16;
        node [shape=box ${getNodeStyle()}];
    `;

    sharedCapability.level2Capabilities.forEach((l2Capability, l2Index) => {
      const l2Letter = String.fromCharCode(65 + l2Index);
      const nodeId = `shared_l1${l1Letter}_l2${l2Letter}`;
      dotGraph += `        ${nodeId} [label="${formatLabel(l2Capability.name)}" tooltip="${l2Capability.description || ''}" ${getNodeStyle(l2Capability.color)}];\n`;
      allL2Nodes.push(nodeId);
    });

    dotGraph += '      }\n';
  });

  // Add invisible edges to create stacking pattern when there are more than 8 L2 capabilities total
  if (shouldStackShared) {
    for (let i = 0; i < allL2Nodes.length - 1; i += 2) {
      if (i + 1 < allL2Nodes.length) {
        dotGraph += `      ${allL2Nodes[i]} -> ${allL2Nodes[i + 1]} [style=invis];\n`;
      }
    }
  }

  dotGraph += '    }\n';

  dotGraph += `
    subgraph cluster_enabling {
      bgcolor="lightsteelblue2";
      label="Enabling Capabilities";
      tooltip="Generalized business functions to support the business";
      fontsize=12;
      fontcolor="black";
      style=solid;
      fontname="Helvetica,Arial,sans-serif";
      ranksep=0.2;
      rankdir=TB;
      labeljust=r;

      node [shape=box ${getNodeStyle()} width=2.75 height=0.8 fontsize=16];
  `;

  parsedContent.enablingCapabilities.forEach((enablingCapability, index) => {
    const enablingNumber = index + 1;
    const nodeId = `enabling_${enablingNumber}`;
    dotGraph += `      ${nodeId} [label="${formatLabel(enablingCapability.name)}" tooltip="${enablingCapability.description || ''}" ${getNodeStyle(enablingCapability.color)}];\n`;
    
    // Only connect odd-numbered nodes to create zigzag pattern
    if (enablingNumber % 2 === 1 && index < parsedContent.enablingCapabilities.length - 1) {
      dotGraph += `      enabling_${enablingNumber} -> enabling_${enablingNumber + 1} [style=invis];\n`;
    }
  });

  dotGraph += '    }\n';

  // Add the cluster alignment connections at the end
  dotGraph += '\n  // This aligns our three clusters one on top of the other. May need adjusting.\n';
  
  // If custom layout is provided, use that instead of default alignment
  if (parsedContent.layout && parsedContent.layout.length > 0) {
    parsedContent.layout.forEach(connection => {
      dotGraph += `  ${connection}\n`;
    });
  } else {
    // First, collect all L1 capabilities with their VS and position info
    const allL1Capabilities = parsedContent.definingCapabilities.valueStreams.flatMap((vs, vsIndex) => 
      vs.level1Capabilities.map((l1, l1Index) => ({
        valueStream: vs,
        vsNumber: vsIndex + 1,
        l1Capability: l1,
        l1Index: l1Index
      }))
    );

    if (allL1Capabilities.length > 0) {
      // Find the middle L1 capability
      const middleL1Index = Math.floor((allL1Capabilities.length - 1) / 2);
      const middleL1Info = allL1Capabilities[middleL1Index];
      
      // Get the last L2 letter for this L1 capability
      const lastL2Index = middleL1Info.l1Capability.level2Capabilities.length - 1;
      const lastL2Letter = String.fromCharCode(65 + lastL2Index);
      const l1Letter = String.fromCharCode(65 + middleL1Info.l1Index);

      const hasSharedCapabilities = parsedContent.sharedCapabilities.length > 0;
      const hasEnablingCapabilities = parsedContent.enablingCapabilities.length > 0;

      if (hasSharedCapabilities) {
        // When L2s are stacked, connect to the middle pair
        const middleL2Index = shouldStackShared 
          ? Math.floor((totalSharedL2s - 1) / 4) * 2 // Get the middle pair's first index
          : Math.floor((totalSharedL2s - 1) / 2);

        // Find which L1 contains this middle L2
        let currentL2Count = 0;
        let middleL1Index = 0;
        let middleL2LocalIndex = 0;

        for (let i = 0; i < parsedContent.sharedCapabilities.length; i++) {
          const l1Cap = parsedContent.sharedCapabilities[i];
          if (currentL2Count + l1Cap.level2Capabilities.length > middleL2Index) {
            middleL1Index = i;
            middleL2LocalIndex = middleL2Index - currentL2Count;
            break;
          }
          currentL2Count += l1Cap.level2Capabilities.length;
        }

        const middleSharedLetter = String.fromCharCode(65 + middleL1Index);
        const middleL2Letter = String.fromCharCode(65 + middleL2LocalIndex);

        // Connect value streams to shared capabilities
        dotGraph += `  vs${middleL1Info.vsNumber}_l1${l1Letter}_l2${lastL2Letter} -> shared_l1${middleSharedLetter}_l2${middleL2Letter} [style=invis];\n`;
        
        // Only connect shared to enabling if enabling capabilities exist
        if (hasEnablingCapabilities) {
          dotGraph += `  shared_l1${middleSharedLetter}_l2${middleL2Letter} -> enabling_${middleEnablingOdd} [style=invis];\n`;
        }
      } else if (hasEnablingCapabilities) {
        // If no shared capabilities but enabling capabilities exist, connect directly to enabling
        dotGraph += `  vs${middleL1Info.vsNumber}_l1${l1Letter}_l2${lastL2Letter} -> enabling_${middleEnablingOdd} [style=invis];\n`;
      }
    }
  }

  dotGraph += '}\n';

  return dotGraph;
}
