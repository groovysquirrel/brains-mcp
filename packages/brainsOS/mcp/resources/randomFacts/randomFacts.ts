import { MCPHandler, MCPDataDefinition } from '../../../handlers/api/mcp/mcpTypes';
import {
  RandomFactData,
  RandomFactResponse,
  isRandomFactData,
  randomFactSchema,
  RandomFact
} from './types';

// Sample data - in a real implementation, this would come from a database
const randomFacts: RandomFact[] = [
  { fact: "Honey never spoils.", category: "Science" },
  { fact: "The shortest war in history lasted 38 minutes.", category: "History" },
  { fact: "A day on Venus is longer than its year.", category: "Science" },
  { fact: "The first oranges weren't orange.", category: "Food" },
  { fact: "Octopuses have three hearts.", category: "Science" }
];

// This is our random facts implementation
export class RandomFactsHandler implements MCPHandler<RandomFactData, RandomFact[]> {
  // Get random facts from a list
  private getRandomFacts(facts: RandomFact[], count: number): RandomFact[] {
    const shuffled = [...facts].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Handle a random facts request
  async handle(input: RandomFactData): Promise<RandomFactResponse> {
    // Validate input
    if (!isRandomFactData(input)) {
      throw new Error('Invalid random facts parameters');
    }

    const { category, count = 5 } = input.query;
    
    // Validate count
    if (count < 1 || count > 100) {
      throw new Error('Count must be between 1 and 100');
    }

    // Filter facts by category if specified
    let facts = randomFacts;
    if (category) {
      facts = randomFacts.filter(fact => fact.category.toLowerCase() === category.toLowerCase());
    }

    // Get random facts
    const selectedFacts = this.getRandomFacts(facts, count);

    // Return the result
    return {
      success: true,
      content: [{
        text: JSON.stringify(selectedFacts),
        data: selectedFacts
      }],
      metadata: {
        requestId: '',  // Will be set by main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// This is what we export to make the random facts resource available
export const randomFactsData: MCPDataDefinition<RandomFactData, RandomFact[]> = {
  name: 'random-facts',
  description: 'Returns a list of random interesting facts',
  schema: randomFactSchema,
  handler: new RandomFactsHandler()
}; 