import { MCPPrompt, MCPResponse, MCPToolSchema } from '../../mcpTypes';

// What parameters do we need for one sentence summary?
export interface OneSentenceParams {
  text: string;  // The text to summarize
  style?: 'formal' | 'casual' | 'technical';  // Optional style for the summary
}

// This is what a one sentence request looks like
export interface OneSentencePrompt extends MCPPrompt {
  type: 'one-sentence';  // Always 'one-sentence' for this prompt
  params: OneSentenceParams;  // The parameters for generating the summary
}

// Response type
export type OneSentenceResponse = MCPResponse<string>;

// Type guard
export function isOneSentencePrompt(prompt: MCPPrompt): prompt is OneSentencePrompt {
  return prompt.type === 'one-sentence';
}

// Schema for one sentence prompt
export const oneSentenceSchema: MCPToolSchema = {
  type: 'function',
  function: {
    name: 'one-sentence',
    description: 'Summarizes text into a single sentence',
    parameters: {
      type: 'object',
      required: ['text'],
      properties: {
        text: {
          type: 'string',
          description: 'The text to summarize'
        },
        style: {
          type: 'string',
          enum: ['formal', 'casual', 'technical'],
          description: 'Style of the summary'
        }
      }
    }
  }
}; 