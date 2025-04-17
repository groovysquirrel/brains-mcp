import { ToolSchema } from '../ToolTypes';

// What types of numbers can we generate?
export type NumberType = 'integer' | 'float';

// Parameters for generating a random number
export interface RandomNumberParams {
  min: number;    // Minimum value (inclusive)
  max: number;    // Maximum value (inclusive)
  type?: NumberType;  // Type of number to generate
}

// Helper function to check if a number type is valid
export function isValidNumberType(type?: string): type is NumberType {
  return type === undefined || type === 'integer' || type === 'float';
}

// Schema that describes how to use the random number generator
export const randomNumberSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'randomNumber',
    description: 'Generates a random number within a specified range',
    parameters: {
      type: 'object',
      properties: {
        min: {
          type: 'number',
          description: 'Minimum value (inclusive)'
        },
        max: {
          type: 'number',
          description: 'Maximum value (inclusive)'
        },
        type: {
          type: 'string',
          enum: ['integer', 'float'],
          description: 'Type of number to generate',
          default: 'integer'
        }
      },
      required: ['min', 'max']
    }
  }
}; 