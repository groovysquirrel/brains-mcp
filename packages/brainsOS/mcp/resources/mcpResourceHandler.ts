import { 
  MCPData, 
  MCPResponse, 
  Data,
  isDogNameData,
  isRandomFactData
} from '../types';

// Sample data - in a real implementation, this would come from a database
const dogNames: Data.DogName[] = [
  { name: "Max", origin: "German" },
  { name: "Luna", origin: "Latin" },
  { name: "Bella", origin: "Italian" },
  { name: "Charlie", origin: "German" },
  { name: "Lucy", origin: "Latin" }
];

const randomFacts: Data.RandomFact[] = [
  { fact: "Honey never spoils.", category: "Science" },
  { fact: "The shortest war in history lasted 38 minutes.", category: "History" },
  { fact: "A day on Venus is longer than its year.", category: "Science" },
  { fact: "The first oranges weren't orange.", category: "Food" },
  { fact: "Octopuses have three hearts.", category: "Science" }
];

export async function handleDogNames(input: MCPData): Promise<MCPResponse<Data.DogName[]>> {
  try {
    if (!isDogNameData(input)) {
      return { error: 'Invalid dog names data request' };
    }
    return { data: dogNames };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function handleRandomFacts(input: MCPData): Promise<MCPResponse<Data.RandomFact[]>> {
  try {
    if (!isRandomFactData(input)) {
      return { error: 'Invalid random facts data request' };
    }
    return { data: randomFacts };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function resourcesHandler(event: any) {
  const path = event.path;
  const query = event.queryStringParameters || {};
  const input: MCPData = {
    type: path.split('/').pop() || '',
    query
  };
  
  if (path.endsWith('/dog-names')) {
    return handleDogNames(input);
  } else if (path.endsWith('/random-facts')) {
    return handleRandomFacts(input);
  }
  
  return { error: 'Invalid resource path' };
} 