import { Transformer, TransformerConfig, TransformerParameters, TransformerResult } from '../../../../types/core/Transformer';
import { TableObject } from './DataTable';

export function parseMarkdown(content: string): TableObject {
  const lines = content.split('\n');
  const headers = lines[0].split('|').map(h => h.trim()).filter(Boolean);
  const rows = [];

  for (let i = 2; i < lines.length; i++) {
    const values = lines[i].split('|').map(v => v.trim()).filter(Boolean);
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

export class MarkdownToObjectTransformer implements Transformer {
  config: TransformerConfig = {
    name: 'markdown-to-object',
    description: 'Converts markdown table to object',
    version: '1.0.0',
    objectType: 'DataTable',
    fromView: 'markdown',
    toView: 'object'
  };

  async transform(input: string, parameters?: TransformerParameters): Promise<TransformerResult> {
    try {
      const result = parseMarkdown(input);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert markdown to object'
      };
    }
  }

  async validate(input: any, parameters?: TransformerParameters): Promise<boolean> {
    return typeof input === 'string' && input.includes('|');
  }
}

export const DataTable_markdownToObjectTransformer = new MarkdownToObjectTransformer(); 