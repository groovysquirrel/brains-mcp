import { Transformer, TransformerConfig, TransformerParameters, TransformerResult } from '../../../../types/core/Transformer';
import { TableObject } from './DataTable';

export function generateCsv(object: TableObject): string {
  const { headers, rows } = object;
  return [
    headers.join(','),
    ...rows.map(row => headers.map(header => row[header]).join(','))
  ].join('\n');
}

export class ObjectToCsvTransformer implements Transformer {
  config: TransformerConfig = {
    name: 'object-to-csv',
    description: 'Converts table object to CSV',
    version: '1.0.0',
    objectType: 'DataTable',
    fromView: 'object',
    toView: 'csv'
  };

  async transform(input: TableObject, parameters?: TransformerParameters): Promise<TransformerResult> {
    try {
      const result = generateCsv(input);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert object to CSV'
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

export const DataTable_objectToCsvTransformer = new ObjectToCsvTransformer(); 