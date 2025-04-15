import { ToolSchema } from '../ToolTypes';

// What formats can we convert between?
export type TableFormat = 'csv' | 'json' | 'markdown';

// Parameters for table conversion
export interface TableConverterParams {
  input: string;          // Input table data
  format: TableFormat;    // Input format
  outputFormat: TableFormat;  // Desired output format
}

// Helper function to check if a format is valid
export function isValidTableFormat(format: string): format is TableFormat {
  return ['csv', 'json', 'markdown'].includes(format);
}

// Schema that describes how to use the table converter
export const tableConverterSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'tableConverter',
    description: 'Converts table data between different formats (CSV, JSON, Markdown)',
    parameters: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'Input table data'
        },
        format: {
          type: 'string',
          enum: ['csv', 'json', 'markdown'],
          description: 'Format of the input data'
        },
        outputFormat: {
          type: 'string',
          enum: ['csv', 'json', 'markdown'],
          description: 'Desired output format'
        }
      },
      required: ['input', 'format', 'outputFormat']
    }
  }
}; 