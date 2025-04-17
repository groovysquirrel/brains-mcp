import { Transformer, TransformerConfig, TransformerResult } from '../../../../types';
import { TableObject } from './DataTable';
import { MarkdownToObjectTransformer } from './md-object';

/**
 * Transformer for converting JSON arrays to DataTable objects
 */
export class JsonToObjectTransformer implements Transformer {
  config: TransformerConfig = {
    name: 'json-to-object',
    description: 'Converts JSON array to DataTable object',
    objectType: 'DataTable',
    fromView: 'json',
    toView: 'object',
    version: '1.0.0'
  };

  async transform(input: string): Promise<TransformerResult> {
    const startTime = Date.now();
    try {
      // Parse the JSON input
      const jsonData = JSON.parse(input);
      
      // Validate that it's an array
      if (!Array.isArray(jsonData)) {
        throw new Error('Input must be a JSON array');
      }

      // Get headers from the first object's keys
      const headers = Object.keys(jsonData[0] || {});

      // Convert array of objects to array of arrays
      const rows = jsonData.map(obj => {
        return headers.reduce((row, header) => {
          row[header] = obj[header] ?? '';
          return row;
        }, {} as Record<string, any>);
      });

      return {
        success: true,
        data: {
          headers,
          rows
        },
        metadata: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: 'Failed to convert JSON to object',
        errorDetails: error instanceof Error ? error.message : 'Unknown error',
        metadata: {
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }
  }

  async validate(input: any): Promise<boolean> {
    try {
      // Check if input is a string
      if (typeof input !== 'string') {
        return false;
      }

      // Try to parse as JSON
      const jsonData = JSON.parse(input);

      // Check if it's an array
      if (!Array.isArray(jsonData)) {
        return false;
      }

      // Check if array is not empty and first item is an object
      if (jsonData.length > 0 && typeof jsonData[0] !== 'object') {
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }
}

export const DataTable_jsonToObjectTransformer = new JsonToObjectTransformer(); 