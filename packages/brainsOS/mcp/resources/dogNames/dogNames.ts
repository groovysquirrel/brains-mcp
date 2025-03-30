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
    console.log('[DogNames Handler] Getting random names:', { totalNames: names.length, requestedCount: count });
    const shuffled = [...names].sort(() => 0.5 - Math.random());
    const result = shuffled.slice(0, count);
    console.log('[DogNames Handler] Selected names:', result);
    return result;
  }

  // Handle a dog names request
  async handle(input: DogNamesData): Promise<DogNamesResponse> {
    console.log('[DogNames Handler] Handling request:', input);

    // Validate input
    if (!isDogNamesData(input)) {
      console.log('[DogNames Handler] Invalid input data');
      throw new Error('Invalid dog names parameters');
    }

    const { count = 5, gender = 'any' } = input.query;
    console.log('[DogNames Handler] Parsed parameters:', { count, gender });
    
    // Validate count
    if (count < 1 || count > 100) {
      console.log('[DogNames Handler] Invalid count:', count);
      throw new Error('Count must be between 1 and 100');
    }

    // Get names based on gender preference
    let names: string[];
    if (gender === 'male') {
      console.log('[DogNames Handler] Getting male names');
      names = this.getRandomNames(DOG_NAMES.male, count);
    } else if (gender === 'female') {
      console.log('[DogNames Handler] Getting female names');
      names = this.getRandomNames(DOG_NAMES.female, count);
    } else {
      console.log('[DogNames Handler] Getting names of any gender');
      // For 'any', combine both lists and get random names
      const allNames = [...DOG_NAMES.male, ...DOG_NAMES.female];
      names = this.getRandomNames(allNames, count);
    }

    // Return the result
    const response = {
      success: true,
      content: [{
        text: JSON.stringify(names),
        data: names
      }],
      metadata: {
        requestId: '',  // Will be set by main handler
        processingTimeMs: 0,
        timestamp: new Date().toISOString()
      }
    };

    console.log('[DogNames Handler] Returning response:', response);
    return response;
  }
}

// This is what we export to make the dog names provider available
export const dogNamesData: MCPDataDefinition<DogNamesData, string[]> = {
  name: 'dog-names',
  description: 'Returns a list of popular dog names',
  schema: dogNamesSchema,
  handler: new DogNamesHandler()
}; 