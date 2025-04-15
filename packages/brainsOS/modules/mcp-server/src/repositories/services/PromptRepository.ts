import { AbstractRepository } from './BaseRepository';
import { MCPPrompt } from '../../types/Prompt';

export class PromptRepository extends AbstractRepository<MCPPrompt> {
  private static instance: PromptRepository;

  private constructor() {
    super('Prompt');
  }

  public static getInstance(): PromptRepository {
    if (!PromptRepository.instance) {
      PromptRepository.instance = new PromptRepository();
    }
    return PromptRepository.instance;
  }

  protected getId(prompt: MCPPrompt): string {
    return prompt.id;
  }

  public async getById(id: string): Promise<MCPPrompt | undefined> {
    return this.get(id);
  }

  public async registerPrompt(prompt: MCPPrompt): Promise<void> {
    await this.register(prompt);
  }

  public async listPrompts(): Promise<MCPPrompt[]> {
    return this.getAll();
  }
} 