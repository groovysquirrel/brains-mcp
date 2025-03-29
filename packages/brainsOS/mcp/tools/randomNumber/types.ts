import { MCPTool, MCPResponse, MCPToolSchema } from '../../mcpTypes';

// What types of numbers can we generate?
export type NumberType = 'integer' | 'real';

// What parameters do we need for number generation?
export interface RandomNumberParams {
  min?: number;        // Optional minimum value
  max?: number;        // Optional maximum value
  type?: NumberType;   // Optional number type (defaults to 'real')
}

// This is what a random number request looks like
export interface RandomNumberTool extends MCPTool {
  type: 'random-number';  // Always 'random-number' for this tool
  params: RandomNumberParams;  // The parameters for number generation
}

// This is what a random number response looks like
export type RandomNumberResponse = MCPResponse<number>;

// Schema that describes how to use the random number generator
export const randomNumberSchema: MCPToolSchema = {
  type: 'function',
  function: {
    name: 'random-number',
    description: 'Generates a random number with optional min/max bounds and type',
    parameters: {
      type: 'object',
      properties: {
        min: {
          type: 'number',
          description: 'Optional minimum value (inclusive)'
        },
        max: {
          type: 'number',
          description: 'Optional maximum value (inclusive)'
        },
        type: {
          type: 'string',
          enum: ['integer', 'real'],
          description: 'Type of number to generate (defaults to real)'
        }
      }
    }
  }
};

// Helper function to check if something is a random number tool
export function isRandomNumberTool(tool: MCPTool): tool is RandomNumberTool {
  return tool.type === 'random-number';
}

// Helper function to check if a number type is valid
export function isValidNumberType(type?: string): type is NumberType {
  return type === undefined || type === 'integer' || type === 'real';
} 