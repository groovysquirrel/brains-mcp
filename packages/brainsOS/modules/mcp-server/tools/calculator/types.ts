import { MCPTool, MCPResponse, MCPToolSchema } from '../../../handlers/api/mcp/mcpTypes';

// What operations can our calculator do?
export type CalculatorOperation = 'add' | 'subtract' | 'multiply' | 'divide';

// What parameters do we need for a calculation?
export interface CalculatorParams {
  operation: CalculatorOperation;  // What operation to perform
  a: number;                      // First number
  b: number;                      // Second number
}

// This is what a calculator request looks like
export interface CalculatorTool extends MCPTool {
  type: 'calculator';             // Always 'calculator' for this tool
  params: CalculatorParams;       // The numbers and operation to use
}

// This is what a calculator response looks like
export type CalculatorResponse = MCPResponse<number>;

// Schema that describes how to use the calculator
export const calculatorSchema: MCPToolSchema = {
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

// Helper function to check if something is a calculator tool
export function isCalculatorTool(tool: MCPTool): tool is CalculatorTool {
  return tool.type === 'calculator';
}

// Helper function to check if an operation is valid
export function isCalculatorOperation(operation: string): operation is CalculatorOperation {
  return ['add', 'subtract', 'multiply', 'divide'].includes(operation);
} 