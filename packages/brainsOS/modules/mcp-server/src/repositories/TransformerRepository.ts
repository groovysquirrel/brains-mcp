import { AbstractRepository } from './services/BaseRepository';
import { MCPTransformer } from '../types/Transformer';

export class TransformerRepository extends AbstractRepository<MCPTransformer> {
  private static instance: TransformerRepository;

  private constructor() {
    super('Transformer');
  }

  public static getInstance(): TransformerRepository {
    if (!TransformerRepository.instance) {
      TransformerRepository.instance = new TransformerRepository();
    }
    return TransformerRepository.instance;
  }

  protected getId(transformer: MCPTransformer): string {
    return transformer.id;
  }

  public async getById(id: string): Promise<MCPTransformer | undefined> {
    return this.get(id);
  }

  public async registerTransformer(transformer: MCPTransformer): Promise<void> {
    await this.register(transformer);
  }

  public async listTransformers(): Promise<MCPTransformer[]> {
    return this.getAll();
  }
} 