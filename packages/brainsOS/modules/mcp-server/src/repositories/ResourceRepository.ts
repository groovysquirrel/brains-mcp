import { AbstractRepository } from './services/BaseRepository';
import { MCPResource } from '../types/Resource';

export class ResourceRepository extends AbstractRepository<MCPResource> {
  private static instance: ResourceRepository;

  private constructor() {
    super('Resource');
  }

  public static getInstance(): ResourceRepository {
    if (!ResourceRepository.instance) {
      ResourceRepository.instance = new ResourceRepository();
    }
    return ResourceRepository.instance;
  }

  protected getId(resource: MCPResource): string {
    return resource.id;
  }

  public async getById(id: string): Promise<MCPResource | undefined> {
    return this.get(id);
  }

  public async registerResource(resource: MCPResource): Promise<void> {
    await this.register(resource);
  }

  public async listResources(): Promise<MCPResource[]> {
    return this.getAll();
  }
} 