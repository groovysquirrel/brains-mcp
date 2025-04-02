import { MCPHandler, MCPToolDefinition } from '../../../handlers/api/mcp/mcpTypes';
import {
  RandomNumberTool,
  RandomNumberResponse,
  isRandomNumberTool,
  isValidNumberType,
  randomNumberSchema,
  RandomNumberParams,
  NumberType
} from './types';

// This is our random number generator implementation
export class RandomNumberHandler implements MCPHandler<RandomNumberTool, number> {
  // Generate a random number based on parameters
  private generateNumber(params: RandomNumberParams): number {
    const { min, max, type = 'real' } = params;

    // If no min/max provided, generate between 0 and 1
    if (min === undefined && max === undefined) {
      return type === 'integer' ? Math.floor(Math.random() * 2) : Number(Math.random().toFixed(3));
    }

    // Validate min/max if provided
    if (min !== undefined && max !== undefined && min > max) {
      throw new Error('Minimum value must be less than or equal to maximum value');
    }

    // Generate number in range
    const range = (max ?? 1) - (min ?? 0);
    const random = Math.random() * range + (min ?? 0);

    // Format based on type
    return type === 'integer' 
      ? Math.floor(random)
      : Number(random.toFixed(3));
  }

  // Handle a random number request
  async handle(input: RandomNumberTool): Promise<RandomNumberResponse> {
    // Validate input
    if (!isRandomNumberTool(input)) {
      throw new Error('Invalid random number tool parameters');
    }

    const { type } = input.params;
    
    // Validate number type
    if (!isValidNumberType(type)) {
      throw new Error('Invalid number type');
    }

    // Generate the random number
    const result = this.generateNumber(input.params);

    // Return the result
    return {
      success: true,
      data: result,
      metadata: {
        requestId: '',  // Will be set by main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// This is what we export to make the random number generator available
export const randomNumberTool: MCPToolDefinition<RandomNumberTool, number> = {
  name: 'random-number',
  description: 'Generates a random number with optional min/max bounds and type',
  schema: randomNumberSchema,
  handler: new RandomNumberHandler()
}; 