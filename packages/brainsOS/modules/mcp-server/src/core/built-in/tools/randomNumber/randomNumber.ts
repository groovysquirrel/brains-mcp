import { Tool, ToolHandler, ToolResponse } from '../ToolTypes';
import { ToolRepository } from '../../../../repositories/services/ToolRepository';
import { RandomNumberParams, randomNumberSchema } from './types';

// This is our random number generator implementation
export class RandomNumberHandler implements ToolHandler<RandomNumberParams, number> {
  // Generate a random number within the specified range
  private generateRandomNumber(min: number, max: number, type: 'integer' | 'float' = 'integer'): number {
    const random = Math.random() * (max - min) + min;
    return type === 'integer' ? Math.floor(random) : random;
  }

  // Handle a random number generation request
  async handle(input: RandomNumberParams): Promise<ToolResponse<number>> {
    const { min, max, type = 'integer' } = input;

    // Validate input
    if (min > max) {
      return {
        success: false,
        error: {
          code: 'INVALID_RANGE',
          message: 'Minimum value must be less than or equal to maximum value'
        },
        metadata: {
          requestId: '',  // Will be set by the main handler
          processingTimeMs: 0,
          timestamp: new Date().toISOString()
        }
      };
    }

    try {
      // Generate the random number
      const result = this.generateRandomNumber(min, max, type);

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
          code: 'GENERATION_ERROR',
          message: error instanceof Error ? error.message : 'Failed to generate random number'
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

// This is what we export to make the random number generator available
export const randomNumberTool: Tool<RandomNumberParams, number> = {
  name: 'randomNumber',
  description: 'Generates a random number within a specified range',
  schema: randomNumberSchema,
  handler: new RandomNumberHandler()
};

// Register the tool with the repository
export function registerRandomNumberTool(repository: ToolRepository): void {
  repository.registerTool(randomNumberTool);
} 