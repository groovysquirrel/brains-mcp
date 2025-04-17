import { Tool, ToolHandler } from '../../../../types/core/Tool';

// Define the random number tool implementation
const randomNumberHandler: ToolHandler = {
  async handle(input: any) {
    const { min, max, type = 'integer' } = input;

    // Validate input
    if (min > max) {
      throw new Error('Minimum value must be less than or equal to maximum value');
    }

    // Generate the random number
    const random = Math.random() * (max - min) + min;
    const result = type === 'integer' ? Math.floor(random) : random;

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

// Define the random number tool
export const randomNumberTool: Tool = {
  name: 'randomNumber',
  description: 'Generates a random number within a specified range',
  schema: {
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
  },
  handler: randomNumberHandler
}; 