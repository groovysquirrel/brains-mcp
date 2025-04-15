import { Tool, ToolHandler, ToolResponse } from '../ToolTypes';
import { ToolRepository } from '../../../../repositories/services/ToolRepository';
import {
  CalculatorParams,
  isCalculatorOperation
} from './types';

// This is our calculator implementation
export class CalculatorHandler implements ToolHandler<CalculatorParams, number> {
  // The actual calculation logic
  private calculate(operation: string, a: number, b: number): number {
    switch (operation) {
      case 'add': return a + b;
      case 'subtract': return a - b;
      case 'multiply': return a * b;
      case 'divide': 
        if (b === 0) throw new Error('Division by zero is not allowed');
        return a / b;
      default: throw new Error('Invalid operation');
    }
  }

  // Handle a calculator request
  async handle(input: CalculatorParams): Promise<ToolResponse<number>> {
    const { operation, a, b } = input;
    
    // Validate operation
    if (!isCalculatorOperation(operation)) {
      return {
        success: false,
        error: {
          code: 'INVALID_OPERATION',
          message: 'Invalid operation'
        },
        metadata: {
          requestId: '',  // Will be set by the main handler
          processingTimeMs: 0,
          timestamp: new Date().toISOString()
        }
      };
    }

    try {
      // Do the calculation
      const result = this.calculate(operation, a, b);

      // Return the result
      return {
        success: true,
        data: result,
        metadata: {
          requestId: '',  // Will be set by the main handler
          processingTimeMs: 0,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: 'CALCULATION_ERROR',
          message: error instanceof Error ? error.message : 'Calculation failed'
        },
        metadata: {
          requestId: '',  // Will be set by the main handler
          processingTimeMs: 0,
          timestamp: new Date().toISOString()
        }
      };
    }
  }
}

// This is what we export to make the calculator available
export const calculatorTool: Tool<CalculatorParams, number> = {
  name: 'calculator',
  description: 'Performs basic arithmetic operations',
  schema: {
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
  },
  handler: new CalculatorHandler()
};

// Register the tool with the repository
export function registerCalculatorTool(repository: ToolRepository): void {
  repository.registerTool(calculatorTool);
} 