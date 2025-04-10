import { MCPHandler, MCPToolDefinition } from '../../../handlers/api/mcp/mcpTypes';
import {
  TableConverterTool,
  TableConverterResponse,
  isTableConverterTool,
  isValidTableFormat,
  tableConverterSchema,
  TableFormat
} from './types';

// This is our table converter implementation
export class TableConverterHandler implements MCPHandler<TableConverterTool, string> {
  // Convert CSV to Markdown table
  private csvToMarkdown(csv: string): string {
    // Split into rows and clean up
    const rows = csv.split('\n').map(row => row.trim()).filter(row => row);
    if (rows.length === 0) throw new Error('Empty CSV input');

    // Split each row into cells and clean up
    const table = rows.map(row => 
      row.split(',').map(cell => cell.trim())
    );

    // Validate all rows have same number of columns
    const columnCount = table[0].length;
    if (!table.every(row => row.length === columnCount)) {
      throw new Error('All rows must have the same number of columns');
    }

    // Create markdown table
    const markdownRows = table.map(row => `| ${row.join(' | ')} |`);
    
    // Add separator row
    const separator = `|${Array(columnCount).fill('---').join('|')}|`;
    
    return [markdownRows[0], separator, ...markdownRows.slice(1)].join('\n');
  }

  // Convert Markdown table to CSV
  private markdownToCsv(markdown: string): string {
    // Split into rows and clean up
    const rows = markdown.split('\n').map(row => row.trim()).filter(row => row);
    if (rows.length < 3) throw new Error('Invalid markdown table: must have header, separator, and at least one data row');

    // Remove the separator row (second row)
    rows.splice(1, 1);

    // Convert each row to CSV
    return rows.map(row => {
      // Remove leading/trailing pipes and split by pipe
      const cells = row.replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
      return cells.join(',');
    }).join('\n');
  }

  // Convert between formats
  private convertTable(input: string, fromFormat: TableFormat, toFormat: TableFormat): string {
    // If formats are the same, just return the input
    if (fromFormat === toFormat) return input;

    // Convert based on formats
    switch (fromFormat) {
      case 'csv':
        return this.csvToMarkdown(input);
      case 'markdown':
        return this.markdownToCsv(input);
      default:
        throw new Error(`Unsupported format: ${fromFormat}`);
    }
  }

  // Handle a table conversion request
  async handle(input: TableConverterTool): Promise<TableConverterResponse> {
    // Validate input
    if (!isTableConverterTool(input)) {
      throw new Error('Invalid table converter parameters');
    }

    const { input: tableText, fromFormat, toFormat } = input.params;
    
    // Validate formats
    if (!isValidTableFormat(fromFormat) || !isValidTableFormat(toFormat)) {
      throw new Error('Invalid table format');
    }

    // Convert the table
    const result = this.convertTable(tableText, fromFormat, toFormat);

    // Return the result
    return {
      success: true,
      data: result,
      metadata: {
        requestId: '',  // Will be set by main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// This is what we export to make the table converter available
export const tableConverterTool: MCPToolDefinition<TableConverterTool, string> = {
  name: 'table-converter',
  description: 'Converts tables between Markdown and CSV formats',
  schema: tableConverterSchema,
  handler: new TableConverterHandler()
}; 