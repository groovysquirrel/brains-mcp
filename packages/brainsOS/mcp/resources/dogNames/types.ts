import { MCPData, MCPResponse, MCPDataSchema } from '../../../handlers/api/mcp/mcpTypes';

// What parameters do we need for dog names?
export interface DogNamesParams {
  count?: number;  // Optional number of names to return
  gender?: 'male' | 'female' | 'any';  // Optional gender preference
}

// This is what a dog names request looks like
export interface DogNamesData extends MCPData {
  type: 'dog-names';  // Always 'dog-names' for this provider
  params: DogNamesParams;  // The parameters for getting dog names
}

// This is what a dog names response looks like
export type DogNamesResponse = MCPResponse<string[]>;

// Schema that describes how to use the dog names provider
export const dogNamesSchema: MCPDataSchema = {
  type: 'function',
  function: {
    name: 'dog-names',
    description: 'Returns a list of popular dog names',
    parameters: {
      type: 'object',
      properties: {
        count: {
          type: 'number',
          description: 'Number of names to return (default: 5)',
          minimum: 1,
          maximum: 100
        },
        gender: {
          type: 'string',
          enum: ['male', 'female', 'any'],
          description: 'Gender preference for the names (default: any)'
        }
      }
    }
  }
};

// Helper function to check if something is a dog names request
export function isDogNamesData(data: MCPData): data is DogNamesData {
  return data.type === 'dog-names';
} 