import { MCPTool, MCPResponse, MCPToolSchema } from '../../../handlers/api/mcp/mcpTypes';

// What formats can we convert between?
export type TableFormat = 'markdown' | 'csv';

// What parameters do we need for conversion?
export interface TableConverterParams {
  input: string;           // The input table text
  fromFormat: TableFormat; // Format to convert from
  toFormat: TableFormat;   // Format to convert to
}

// This is what a table conversion request looks like
export interface TableConverterTool extends MCPTool {
  type: 'table-converter';  // Always 'table-converter' for this tool
  params: TableConverterParams;  // The conversion parameters
}

// This is what a table conversion response looks like
export type TableConverterResponse = MCPResponse<string>;

// Schema that describes how to use the table converter
export const tableConverterSchema: MCPToolSchema = {
  type: 'function',
  function: {
    name: 'table-converter',
    description: 'Converts tables between Markdown and CSV formats',
    parameters: {
      type: 'object',
      properties: {
        input: {
          type: 'string',
          description: 'The input table text to convert'
        },
        fromFormat: {
          type: 'string',
          enum: ['markdown', 'csv'],
          description: 'Format of the input table'
        },
        toFormat: {
          type: 'string',
          enum: ['markdown', 'csv'],
          description: 'Format to convert the table to'
        }
      },
      required: ['input', 'fromFormat', 'toFormat']
    }
  }
};

// Helper function to check if something is a table converter tool
export function isTableConverterTool(tool: MCPTool): tool is TableConverterTool {
  return tool.type === 'table-converter';
}

// Helper function to check if a format is valid
export function isValidTableFormat(format: string): format is TableFormat {
  return format === 'markdown' || format === 'csv';
} 