import { Transformer, TransformerConfig, TransformerParameters, TransformerResult } from '../../../../types/core/Transformer';
import { TableObject } from './DataTable';

export function parseCsv(content: string): TableObject {
  const lines = content.split('\n');
  const headers = lines[0].split(',').map(h => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.trim());
    const row: Record<string, string> = {};
    headers.forEach((header, index) => {
      row[header] = values[index] || '';
    });
    rows.push(row);
  }

  return { headers, rows };
}

export class CsvToObjectTransformer implements Transformer {
  config: TransformerConfig = {
    name: 'csv-to-object',
    description: 'Converts CSV to table object',
    version: '1.0.0',
    objectType: 'DataTable',
    fromView: 'csv',
    toView: 'object'
  };

  async transform(input: string, parameters?: TransformerParameters): Promise<TransformerResult> {
    try {
      const result = parseCsv(input);
      return {
        success: true,
        data: result
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to convert CSV to object'
      };
    }
  }

  async validate(input: any, parameters?: TransformerParameters): Promise<boolean> {
    return typeof input === 'string' && input.includes(',');
  }
}

export const DataTable_csvToObjectTransformer = new CsvToObjectTransformer(); 