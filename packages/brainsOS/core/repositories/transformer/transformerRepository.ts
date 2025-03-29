import { StorageRepository } from '../base/storageRepository';
import { StoredTransformer, Transformer, toStoredTransformer } from './transformerTypes';
import { defaults } from '../../../data/dataIndex';
import { getStorageService } from '../../services/storage/dynamo/storageFactory';

class TransformerRepository extends StorageRepository<StoredTransformer> {
  protected typeName = 'transformer';
  protected dataType = 'transformer';
  private static instance: TransformerRepository;

  private constructor() {
    super(getStorageService('system'));
  }

  static getInstance(): TransformerRepository {
    if (!this.instance) {
      this.instance = new TransformerRepository();
    }
    return this.instance;
  }

  static getUserInstance(): never {
    throw new Error('Transformers can only be stored in system storage');
  }

  async getTransformers(userId: string, objectType?: string): Promise<StoredTransformer[]> {
    const prefix = objectType ? `${this.typeName}#${objectType}#` : `${this.typeName}#`;
    const transformers = await this.queryItems(userId, prefix);
    
    if (transformers.length === 0) {
      console.log(`No transformers found for ${userId}, loading defaults...`);
      return this.loadDefaults(userId);
    }
    return transformers;
  }

  async findTransformer(userId: string, objectType: string, fromView: string, toView: string): Promise<StoredTransformer | null> {
    const id = `${this.typeName}#${objectType}#${fromView}_${toView}`;
    console.log(`Looking for transformer with id: ${id}`);
    const transformer = await this.getItem(userId, id);
    console.log(`Found transformer:`, transformer);
    return transformer;
  }

  async findTransformationPath(userId: string, objectType: string, fromView: string, toView: string): Promise<StoredTransformer[]> {
    console.log(`Finding transformation path for ${objectType} from ${fromView} to ${toView}`);
    
    const directTransformer = await this.findTransformer(userId, objectType, fromView, toView);
    console.log('Direct transformer result:', directTransformer);
    
    if (directTransformer) {
      return [directTransformer];
    }

    if (fromView !== 'object' && toView !== 'object') {
      console.log('Trying intermediate object transformation');
      const toObject = await this.findTransformer(userId, objectType, fromView, 'object');
      const fromObject = await this.findTransformer(userId, objectType, 'object', toView);
      
      console.log('To object transformer:', toObject);
      console.log('From object transformer:', fromObject);
      
      if (toObject && fromObject) {
        return [toObject, fromObject];
      }
    }

    console.log('No transformation path found');
    return [];
  }

  async saveTransformer(userId: string, transformer: Transformer): Promise<void> {
    const id = `${this.typeName}#${transformer.objectType}#${transformer.fromView}_${transformer.toView}`;
    console.log('Saving transformer with id:', id);
    
    const storedTransformer = toStoredTransformer({
      ...transformer,
      id,
      userId,
      dataType: this.dataType
    });
    
    await this.putItem(userId, id, storedTransformer);
  }

  async deleteTransformers(userId: string, objectType?: string): Promise<void> {
    const transformers = await this.getTransformers(userId, objectType);
    await Promise.all(
      transformers.map(transformer => this.deleteItem(userId, transformer.id))
    );
  }

  private async loadDefaults(userId: string): Promise<StoredTransformer[]> {
    console.log('Loading defaults, current transformers:', defaults.transformers);
    
    if (!defaults.transformers || defaults.transformers.length === 0) {
      console.log('No default transformers configured');
      return [];
    }

    console.log('Loading default transformers...');
    
    const transformers: Transformer[] = defaults.transformers.flatMap(obj => {
      console.log('Processing object:', obj);
      return obj.transformers.map(transformer => ({
        name: `${obj.objectType}_${transformer.fromView}_${transformer.toView}`,
        version: '1.0.0',
        createdBy: 'system',
        objectType: obj.objectType,
        fromView: transformer.fromView,
        toView: transformer.toView,
        description: transformer.description,
        tags: [...(obj.tags || []), ...(transformer.tags || [])],
        transformerDetails: transformer.transformerDetails
      }));
    });

    console.log('Created transformers:', transformers);

    await Promise.all(
      transformers.map(async transformer => {
        await this.saveTransformer(userId, transformer);
      })
    );

    return this.getTransformers(userId);
  }
}

// Export only system instance
export const transformerRepository = TransformerRepository.getInstance();

// For backwards compatibility, but mark as deprecated
/** @deprecated Use transformerRepository instead */
export const systemTransformerRepository = transformerRepository; 