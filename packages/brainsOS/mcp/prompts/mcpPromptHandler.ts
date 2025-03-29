import { 
  MCPPrompt, 
  MCPResponse, 
  Prompts,
  isJokePrompt,
  isRapPrompt
} from '../types';

// Sample jokes - in a real implementation, these would come from a database or external API
const dadJokes = [
  "Why don't programmers like nature? It has too many bugs.",
  "What do you call a bear with no teeth? A gummy bear!",
  "Why did the scarecrow win an award? Because he was outstanding in his field!"
];

const puns = [
  "I'm reading a book on anti-gravity. It's impossible to put down!",
  "Time flies like an arrow. Fruit flies like a banana.",
  "I used to be a baker, but I couldn't make enough dough."
];

const generalJokes = [
  "Why did the AI assistant go to therapy? It had too many processing issues!",
  "What's a programmer's favorite place? The foo bar.",
  "Why do programmers prefer dark mode? Because light attracts bugs!"
];

const rapStyles = {
  old_school: [
    "Yo, {topic} in the house, let me tell you what it's about",
    "Back in the day, {topic} was the way to play",
    "Listen up y'all, {topic} is the call"
  ],
  modern: [
    "Straight up, {topic} is where it's at",
    "Check it out, {topic} is what I'm talking about",
    "Let me tell you 'bout {topic}, that's the truth"
  ]
};

export async function handleJokePrompt(input: MCPPrompt): Promise<MCPResponse<string>> {
  try {
    if (!isJokePrompt(input)) {
      return { error: 'Invalid joke prompt parameters' };
    }

    const { type = 'general' } = input.params;
    let jokes: string[];
    
    switch (type) {
      case 'dad':
        jokes = dadJokes;
        break;
      case 'pun':
        jokes = puns;
        break;
      default:
        jokes = generalJokes;
    }
    
    const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];
    return { data: randomJoke };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function handleRapPrompt(input: MCPPrompt): Promise<MCPResponse<string>> {
  try {
    if (!isRapPrompt(input)) {
      return { error: 'Invalid rap prompt parameters' };
    }

    const { topic, style = 'modern' } = input.params;
    const templates = rapStyles[style];
    const randomTemplate = templates[Math.floor(Math.random() * templates.length)];
    
    return { data: randomTemplate.replace('{topic}', topic) };
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Unknown error occurred' };
  }
}

export async function promptsHandler(event: any) {
  const path = event.path;
  const body = JSON.parse(event.body || '{}') as MCPPrompt;
  
  if (path.endsWith('/joke')) {
    return handleJokePrompt(body);
  } else if (path.endsWith('/rap')) {
    return handleRapPrompt(body);
  }
  
  return { error: 'Invalid prompt path' };
} 