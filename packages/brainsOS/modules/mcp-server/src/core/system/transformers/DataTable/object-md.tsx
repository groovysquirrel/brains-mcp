import { Transformer, TransformerConfig, TransformerParameters, TransformerResult } from '../../../../types/core/Transformer';
import { TableObject } from './DataTable';

export function generateMarkdown(object: TableObject): string {
  const { headers, rows } = object;
  return [
    `|${headers.join('|')}|`,
    `|${headers.map(() => '---').join('|')}|`,
    ...rows.map(row => `|${headers.map(header => row[header]).join('|')}|`)
  ].join('\n');
}

export class ObjectToMarkdownTransformer implements Transformer {
  config: TransformerConfig = {
    name: 'object-to-markdown',
    description: 'Converts table object to markdown',
    version: '1.0.0',
    objectType: 'DataTable',
    fromView: 'object',
    toView: 'markdown'
  };

  async transform(input: TableObject, parameters?: TransformerParameters): Promise<TransformerResult> {
    try {
      const result = generateMarkdown(input);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert object to markdown'
      };
    }
  }

  async validate(input: any, parameters?: TransformerParameters): Promise<boolean> {
    return (
      typeof input === 'object' &&
      Array.isArray(input.headers) &&
      Array.isArray(input.rows) &&
      input.headers.length > 0
    );
  }
}

export const DataTable_objectToMarkdownTransformer = new ObjectToMarkdownTransformer(); 