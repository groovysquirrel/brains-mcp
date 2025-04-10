import { ITRGObject } from './itrg-bra';

interface CsvRow {
  type: string;
  valueStream: string;
  level: string;
  parent: string;
  label: string;
  description: string;
  color?: string;
}

export function generateCsv(parsedContent: ITRGObject): string {
  const rows: CsvRow[] = [];

  // Header
  const header = ['Type', 'Value Stream', 'Level', 'Parent', 'Label', 'Description', 'Color'].join(',');

  // Process Defining Capabilities
  parsedContent.definingCapabilities.valueStreams.forEach(valueStream => {
    valueStream.level1Capabilities.forEach(l1Cap => {
      // Add L1 capability
      rows.push({
        type: 'defining',
        valueStream: valueStream.name,
        level: 'Level 1',
        parent: 'N/A',
        label: l1Cap.name,
        description: l1Cap.description || '',
        color: l1Cap.color
      });

      // Add L2 capabilities
      l1Cap.level2Capabilities.forEach(l2Cap => {
        rows.push({
          type: 'defining',
          valueStream: valueStream.name,
          level: 'Level 2',
          parent: l1Cap.name,
          label: l2Cap.name,
          description: l2Cap.description || '',
          color: l2Cap.color
        });
      });
    });
  });

  // Process Shared Capabilities
  parsedContent.sharedCapabilities.forEach(l1Cap => {
    // Add L1 capability
    rows.push({
      type: 'shared',
      valueStream: 'all',
      level: 'Level 1',
      parent: 'N/A',
      label: l1Cap.name,
      description: l1Cap.description || '',
      color: l1Cap.color
    });

    // Add L2 capabilities
    l1Cap.level2Capabilities.forEach(l2Cap => {
      rows.push({
        type: 'shared',
        valueStream: 'all',
        level: 'Level 2',
        parent: l1Cap.name,
        label: l2Cap.name,
        description: l2Cap.description || '',
        color: l2Cap.color
      });
    });
  });

  // Process Enabling Capabilities
  parsedContent.enablingCapabilities.forEach(l1Cap => {
    // Add L1 capability
    rows.push({
      type: 'enabling',
      valueStream: 'core',
      level: 'Level 1',
      parent: 'N/A',
      label: l1Cap.name,
      description: l1Cap.description || '',
      color: l1Cap.color
    });

    // Add L2 capabilities
    l1Cap.level2Capabilities.forEach(l2Cap => {
      rows.push({
        type: 'enabling',
        valueStream: 'core',
        level: 'Level 2',
        parent: l1Cap.name,
        label: l2Cap.name,
        description: l2Cap.description || '',
        color: l2Cap.color
      });
    });
  });

  // Convert rows to CSV strings, properly escaping fields
  const csvRows = rows.map(row => [
    row.type,
    escapeCsvField(row.valueStream),
    row.level,
    escapeCsvField(row.parent),
    escapeCsvField(row.label),
    escapeCsvField(row.description),
    row.color || ''  // Empty string if no color
  ].join(','));

  return [header, ...csvRows].join('\n');
}

// Helper function to escape CSV fields
function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

// Test function with sample input
export function testCsvGenerator() {
  const sampleInput = {
    definingCapabilities: {
      valueStreams: [{
        name: "Business Development and Marketing",
        level1Capabilities: [{
          name: "Market Analysis",
          description: "Researching and understanding market trends",
          level2Capabilities: [{
            name: "Competitor Analysis",
            description: "Identifying and analyzing key competitors"
          }]
        }]
      }]
    },
    sharedCapabilities: [{
      name: "Knowledge Management",
      description: "Managing organizational knowledge",
      level2Capabilities: [{
        name: "Document Management",
        description: "Managing legal documents"
      }]
    }],
    enablingCapabilities: [{
      name: "IT Infrastructure",
      description: "Managing IT systems",
      level2Capabilities: [{
        name: "Network Management",
        description: "Managing network infrastructure"
      }]
    }]
  };

  console.log('Testing CSV generator with sample input...\n');
  const result = generateCsv(sampleInput);
  console.log('\nGenerated CSV:\n');
  console.log(result);
  console.log('\nTest complete!');

}
