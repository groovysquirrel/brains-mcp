import { MCPData, MCPResponse, MCPDataSchema } from '../../mcpTypes';

// What parameters do we need for random facts?
export interface RandomFactParams {
  category?: string;  // Optional category to filter facts
  count?: number;     // Optional number of facts to return
}

// This is what a random facts request looks like
export interface RandomFactData extends MCPData {
  type: 'random-facts';  // Always 'random-facts' for this resource
  query: RandomFactParams;  // The query parameters for filtering facts
}

// Response type
export type RandomFactResponse = MCPResponse<RandomFact[]>;

// Type guard
export function isRandomFactData(data: MCPData): data is RandomFactData {
  return data.type === 'random-facts';
}

// Schema for random facts resource
export const randomFactSchema: MCPDataSchema = {
  type: 'function',
  function: {
    name: 'random-facts',
    description: 'Returns random interesting facts',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category of facts to return'
        },
        count: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Number of facts to return'
        }
      }
    }
  }
};

// Data type for a random fact
export interface RandomFact {
  fact: string;
  category: string;
} 