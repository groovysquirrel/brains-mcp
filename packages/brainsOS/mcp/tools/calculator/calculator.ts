import { MCPHandler, MCPToolDefinition } from '../../../handlers/api/mcp/mcpTypes';
import {
  CalculatorTool,
  CalculatorResponse,
  isCalculatorTool,
  isCalculatorOperation,
  calculatorSchema
} from './types';

// This is our calculator implementation
export class CalculatorHandler implements MCPHandler<CalculatorTool, number> {
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
  async handle(input: CalculatorTool): Promise<CalculatorResponse> {
    // Validate input
    if (!isCalculatorTool(input)) {
      throw new Error('Invalid calculator tool parameters');
    }

    const { operation, a, b } = input.params;
    
    // Validate operation
    if (!isCalculatorOperation(operation)) {
      throw new Error('Invalid operation');
    }

    // Do the calculation
    const result = this.calculate(operation, a, b);

    // Return the result
    return {
      success: true,
      content: [{
        text: `Result of ${a} ${operation} ${b} = ${result}`,
        data: result
      }],
      metadata: {
        requestId: '',  // Will be set by the main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// This is what we export to make the calculator available
export const calculatorTool: MCPToolDefinition<CalculatorTool, number> = {
  name: 'calculator',
  description: 'Performs basic arithmetic operations',
  schema: calculatorSchema,
  handler: new CalculatorHandler()
}; 