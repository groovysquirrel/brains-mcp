import { Logger } from '../../../../../shared/Logger';

export interface BaseRepository<T> {
  initialize(): Promise<void>;
  get(id: string): Promise<T | undefined>;
  getAll(): Promise<T[]>;
  register(item: T): Promise<void>;
}

export abstract class AbstractRepository<T> implements BaseRepository<T> {
  protected items: Map<string, T> = new Map();
  protected logger: Logger;
  protected initialized: boolean = false;

  constructor(protected repositoryName: string) {
    this.logger = new Logger(`MCP-${repositoryName}-Repository`);
  }

  public async initialize(): Promise<void> {
    if (this.initialized) {
      this.logger.debug(`${this.repositoryName} repository already initialized, skipping`);
      return;
    }
    
    this.logger.info(`Initializing ${this.repositoryName} repository`);
    // Load initial items if needed
    
    this.initialized = true;
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
      this.logger.warn(`Item with id ${id} already exists in ${this.repositoryName} repository, skipping registration`);
      return;
    }
    this.items.set(id, item);
    this.logger.info(`Registered item in ${this.repositoryName} repository: ${id}`);
  }

  protected abstract getId(item: T): string;
} 