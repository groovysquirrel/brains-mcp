import { Transformer, TransformerConfig, TransformerResult } from '../../../../types';
import { TableObject } from './DataTable';

/**
 * Transformer for converting DataTable objects to JSON format
 */
export class ObjectToJsonTransformer implements Transformer {
  config: TransformerConfig = {
    name: 'data-table-object-to-json',
    description: 'Converts a DataTable object to JSON format',
    objectType: 'DataTable',
    fromView: 'object',
    toView: 'json',
    version: '1.0.0'
  };

  async transform(input: TableObject): Promise<TransformerResult> {
    const startTime = Date.now();
    try {
      return {
        success: true,
        data: JSON.stringify(input, null, 2),
        metadata: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to convert object to JSON',
        metadata: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async validate(input: any): Promise<boolean> {
    // Check if input is a valid DataTable object
    return (
      typeof input === 'object' &&
      Array.isArray(input.headers) &&
      Array.isArray(input.rows) &&
      input.headers.length > 0 &&
      input.rows.every((row: any) => 
        typeof row === 'object' && 
        !Array.isArray(row) && 
        input.headers.every((header: string) => header in row)
      )
    );
  }
}

export const DataTable_objectToJsonTransformer = new ObjectToJsonTransformer(); 