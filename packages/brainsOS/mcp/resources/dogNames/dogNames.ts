import { MCPHandler, MCPDataDefinition } from '../../mcpTypes';
import {
  DogNamesData,
  DogNamesResponse,
  isDogNamesData,
  dogNamesSchema
} from './types';

// Our database of dog names
const DOG_NAMES = {
  male: [
    'Max', 'Charlie', 'Cooper', 'Buddy', 'Rocky',
    'Duke', 'Bear', 'Tucker', 'Jack', 'Oliver',
    'Leo', 'Milo', 'Zeus', 'Finn', 'Murphy'
  ],
  female: [
    'Luna', 'Bella', 'Lucy', 'Daisy', 'Molly',
    'Sadie', 'Gracie', 'Bailey', 'Penny', 'Ruby',
    'Rosie', 'Ginger', 'Willow', 'Pepper', 'Nala'
  ]
};

// This is our dog names implementation
export class DogNamesHandler implements MCPHandler<DogNamesData, string[]> {
  // Get random names from a list
  private getRandomNames(names: string[], count: number): string[] {
    const shuffled = [...names].sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  // Handle a dog names request
  async handle(input: DogNamesData): Promise<DogNamesResponse> {
    // Validate input
    if (!isDogNamesData(input)) {
      throw new Error('Invalid dog names parameters');
    }

    const { count = 5, gender = 'any' } = input.params;
    
    // Validate count
    if (count < 1 || count > 100) {
      throw new Error('Count must be between 1 and 100');
    }

    // Get names based on gender preference
    let names: string[];
    if (gender === 'male') {
      names = this.getRandomNames(DOG_NAMES.male, count);
    } else if (gender === 'female') {
      names = this.getRandomNames(DOG_NAMES.female, count);
    } else {
      // For 'any', combine both lists and get random names
      const allNames = [...DOG_NAMES.male, ...DOG_NAMES.female];
      names = this.getRandomNames(allNames, count);
    }

    // Return the result
    return {
      success: true,
      data: names,
      metadata: {
        requestId: '',  // Will be set by main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };
  }
}

// This is what we export to make the dog names provider available
export const dogNamesData: MCPDataDefinition<DogNamesData, string[]> = {
  name: 'dog-names',
  description: 'Returns a list of popular dog names',
  schema: dogNamesSchema,
  handler: new DogNamesHandler()
}; 