import { AbstractRepository } from './BaseRepository';
import { Tool } from '../../types/core/Tool';
import { Logger } from '../../../../utils/logging/Logger';

export class ToolRepository extends AbstractRepository<Tool> {
  private static instance: ToolRepository;
  protected logger: Logger;

  private constructor() {
    super('Tool');
    this.logger = new Logger('ToolRepository');
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
    this.logger.info('Registering tool:', { name: tool.name });
    await this.register(tool);
    this.logger.info('Tool registered successfully:', { name: tool.name });
  }

  public async listTools(): Promise<Tool[]> {
    const tools = await this.getAll();
    this.logger.info('Listed tools:', { count: tools.length, tools: tools.map(t => t.name) });
    return tools;
  }
} 