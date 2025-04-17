import { Tool, ToolHandler } from '../../../../types/core/Tool';

// Define the calculator tool implementation
const calculatorHandler: ToolHandler = {
  async handle(input: any) {
    const { operation, a, b } = input;
    
    let result;
    switch (operation) {
      case 'add':
        result = a + b;
        break;
      case 'subtract':
        result = a - b;
        break;
      case 'multiply':
        result = a * b;
        break;
      case 'divide':
        if (b === 0) {
          throw new Error('Division by zero');
        }
        result = a / b;
        break;
      default:
        throw new Error(`Unsupported operation: ${operation}`);
    }

    return {
      success: true,
      data: { result },
      metadata: {
        requestId: input.requestId,
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
};

// Define the calculator tool
export const calculatorTool: Tool = {
  name: 'calculator',
  description: 'Performs basic arithmetic operations',
  schema: {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Performs basic arithmetic operations (add, subtract, multiply, divide)',
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
  handler: calculatorHandler
}; 