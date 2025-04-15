import { Tool, ToolHandler, ToolResponse } from '../ToolTypes';
import { ToolRepository } from '../../../../repositories/services/ToolRepository';
import { TableConverterParams, tableConverterSchema } from './types';

// This is our table converter implementation
export class TableConverterHandler implements ToolHandler<TableConverterParams, string> {
  // Convert CSV to JSON
  private csvToJson(csv: string): string {
    const lines = csv.split('\n');
    const headers = lines[0].split(',').map(h => h.trim());
    const result = [];

    for (let i = 1; i < lines.length; i++) {
      const values = lines[i].split(',').map(v => v.trim());
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      result.push(row);
    }

    return JSON.stringify(result, null, 2);
  }

  // Convert JSON to CSV
  private jsonToCsv(json: string): string {
    const data = JSON.parse(json);
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid JSON data: must be a non-empty array of objects');
    }

    const headers = Object.keys(data[0]);
    const csv = [
      headers.join(','),
      ...data.map(row => headers.map(header => row[header]).join(','))
    ].join('\n');

    return csv;
  }

  // Convert Markdown to JSON
  private markdownToJson(markdown: string): string {
    const lines = markdown.split('\n');
    const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
    const result = [];

    for (let i = 2; i < lines.length; i++) {
      const values = lines[i].split('|').map(v => v.trim()).filter(Boolean);
      const row: Record<string, string> = {};
      headers.forEach((header, index) => {
        row[header] = values[index] || '';
      });
      result.push(row);
    }

    return JSON.stringify(result, null, 2);
  }

  // Convert JSON to Markdown
  private jsonToMarkdown(json: string): string {
    const data = JSON.parse(json);
    if (!Array.isArray(data) || data.length === 0) {
      throw new Error('Invalid JSON data: must be a non-empty array of objects');
    }

    const headers = Object.keys(data[0]);
    const markdown = [
      `|${headers.join('|')}|`,
      `|${headers.map(() => '---').join('|')}|`,
      ...data.map(row => `|${headers.map(header => row[header]).join('|')}|`)
    ].join('\n');

    return markdown;
  }

  // Handle a table conversion request
  async handle(input: TableConverterParams): Promise<ToolResponse<string>> {
    const { input: inputData, format, outputFormat } = input;

    try {
      let result: string;

      // Convert based on input and output formats
      if (format === 'csv' && outputFormat === 'json') {
        result = this.csvToJson(inputData);
      } else if (format === 'json' && outputFormat === 'csv') {
        result = this.jsonToCsv(inputData);
      } else if (format === 'markdown' && outputFormat === 'json') {
        result = this.markdownToJson(inputData);
      } else if (format === 'json' && outputFormat === 'markdown') {
        result = this.jsonToMarkdown(inputData);
      } else {
        return {
          success: false,
          error: {
            code: 'UNSUPPORTED_CONVERSION',
            message: `Conversion from ${format} to ${outputFormat} is not supported`
          },
          metadata: {
            requestId: '',  // Will be set by the main handler
            processingTimeMs: 0,
            timestamp: new Date().toISOString()
          }
        };
      }

      return {
        success: true,
        data: result,
        metadata: {
          requestId: '',  // Will be set by the main handler
          processingTimeMs: 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CONVERSION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to convert table'
        },
        metadata: {
          requestId: '',  // Will be set by the main handler
          processingTimeMs: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

// This is what we export to make the table converter available
export const tableConverterTool: Tool<TableConverterParams, string> = {
  name: 'tableConverter',
  description: 'Converts table data between different formats (CSV, JSON, Markdown)',
  schema: tableConverterSchema,
  handler: new TableConverterHandler()
};

// Register the tool with the repository
export function registerTableConverterTool(repository: ToolRepository): void {
  repository.registerTool(tableConverterTool);
} 