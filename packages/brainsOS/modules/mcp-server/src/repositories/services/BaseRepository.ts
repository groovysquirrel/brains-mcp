import { Logger } from '../../../../utils/logging/Logger';

export interface BaseRepository<T> {
  initialize(): Promise<void>;
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  register(item: T): Promise<void>;
}

export abstract class AbstractRepository<T> implements BaseRepository<T> {
  protected items: Map<string, T> = new Map();
  protected logger: Logger;

  constructor(protected repositoryName: string) {
    this.logger = new Logger(`MCP-${repositoryName}-Repository`);
  }

  public async initialize(): Promise<void> {
    this.logger.info(`Initializing ${this.repositoryName} repository`);
    // Load initial items if needed
  }

  public async get(id: string): Promise<T | undefined> {
    return this.items.get(id);
  }

  public async getAll(): Promise<T[]> {
    return Array.from(this.items.values());
  }

  public async register(item: T): Promise<void> {
    const id = this.getId(item);
    if (this.items.has(id)) {
      throw new Error(`Item with id ${id} already exists in ${this.repositoryName} repository`);
    }
    this.items.set(id, item);
    this.logger.info(`Registered item in ${this.repositoryName} repository: ${id}`);
  }

  protected abstract getId(item: T): string;
} 