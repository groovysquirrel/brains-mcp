import { ToolSchema } from '../ToolTypes';

// What operations can our calculator do?
export type CalculatorOperation = 'add' | 'subtract' | 'multiply' | 'divide';

// What parameters do we need for a calculation?
export interface CalculatorParams {
  operation: CalculatorOperation;  // What operation to perform
  a: number;                      // First number
  b: number;                      // Second number
}

// Helper function to check if an operation is valid
export function isCalculatorOperation(operation: string): operation is CalculatorOperation {
  return ['add', 'subtract', 'multiply', 'divide'].includes(operation);
}

// Schema that describes how to use the calculator
export const calculatorSchema: ToolSchema = {
  type: 'function',
  function: {
    name: 'calculator',
    description: 'Performs basic arithmetic operations',
    parameters: {
      type: 'object',
      properties: {
        operation: {
          type: 'string',
          enum: ['add', 'subtract', 'multiply', 'divide'],
          description: 'The arithmetic operation to perform'
        },
        a: {
          type: 'number',
          description: 'First operand'
        },
        b: {
          type: 'number',
          description: 'Second operand'
        }
      },
      required: ['operation', 'a', 'b']
    }
  }
}; 