import { AbstractRepository } from './services/BaseRepository';
import { Tool } from '../core/built-in/tools/ToolTypes';

export class ToolRepository extends AbstractRepository<Tool> {
  private static instance: ToolRepository;

  private constructor() {
    super('Tool');
  }

  public static getInstance(): ToolRepository {
    if (!ToolRepository.instance) {
      ToolRepository.instance = new ToolRepository();
    }
    return ToolRepository.instance;
  }

  protected getId(tool: Tool): string {
    return tool.name;
  }

  public async getByName(name: string): Promise<Tool | undefined> {
    return this.get(name);
  }

  public async registerTool(tool: Tool): Promise<void> {
    await this.register(tool);
  }

  public async listTools(): Promise<Tool[]> {
    return this.getAll();
  }
} 