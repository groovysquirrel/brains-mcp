import { MCPHandler, MCPToolDefinition } from '../../../handlers/api/mcp/mcpTypes';
import {
  OneSentencePrompt,
  OneSentenceResponse,
  isOneSentencePrompt,
  oneSentenceSchema
} from './types';

// This is our one sentence implementation
export class OneSentenceHandler implements MCPHandler<OneSentencePrompt, string> {
  // Handle a one sentence request
  async handle(input: OneSentencePrompt): Promise<OneSentenceResponse> {
    // Validate input
    if (!isOneSentencePrompt(input)) {
      throw new Error('Invalid one sentence parameters');
    }

    const { text, style = 'formal' } = input.params;
    
    // Validate text
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    // Generate the summary based on style
    let summary: string;
    switch (style) {
      case 'casual':
        summary = this.generateCasualSummary(text);
        break;
      case 'technical':
        summary = this.generateTechnicalSummary(text);
        break;
      default: // formal
        summary = this.generateFormalSummary(text);
    }

    // Return the result
    return {
      success: true,
      data: summary,
      metadata: {
        requestId: '',  // Will be set by main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }

  private generateFormalSummary(text: string): string {
    // In a real implementation, this would use an LLM
    // For now, we'll just return a simple summary
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return text;
    return sentences[0].trim();
  }

  private generateCasualSummary(text: string): string {
    // In a real implementation, this would use an LLM with casual tone
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return text;
    return `Basically, ${sentences[0].trim().toLowerCase()}`;
  }

  private generateTechnicalSummary(text: string): string {
    // In a real implementation, this would use an LLM with technical focus
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    if (sentences.length === 0) return text;
    return `The analysis indicates that ${sentences[0].trim().toLowerCase()}`;
  }
}

// This is what we export to make the one sentence prompt available
export const oneSentencePrompt: MCPToolDefinition<OneSentencePrompt, string> = {
  name: 'one-sentence',
  description: 'Summarizes text into a single sentence',
  schema: oneSentenceSchema,
  handler: new OneSentenceHandler()
}; 