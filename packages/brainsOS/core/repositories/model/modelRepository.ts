import { VersionedRepository } from '../base/versionedRepository';
import { StoredModel, toStoredModel } from '../../types/modelTypes';
import { defaults } from '../../../data/dataIndex';
import { getStorageService } from '../../services/storage/dynamo/storageFactory';

export class ModelRepository extends VersionedRepository<StoredModel> {
  protected typeName = 'model';
  protected dataType = 'model';
  private static instances: Record<string, ModelRepository> = {};

  private constructor(storageType: 'user' | 'system' = 'system') {
    super(getStorageService(storageType));
  }

  static getInstance(storageType: 'user' | 'system' = 'system'): ModelRepository {
    if (!this.instances[storageType]) {
      this.instances[storageType] = new ModelRepository(storageType);
    }
    return this.instances[storageType];
  }

  // Override getAll to handle loading defaults
  async getAll(userId: string): Promise<StoredModel[]> {
    console.log('[ModelRepository] Getting all models for user:', userId);
    
    // First get all references
    const queryPrefix = `ref#${this.dataType}#`;
    console.log('[ModelRepository] Querying with prefix:', queryPrefix);
    
    const refs = await super.queryItems(userId, queryPrefix);
    console.log('[ModelRepository] Query returned:', refs.length, 'items');
    
    // If no references found, load defaults
    if (!refs || refs.length === 0) {
      console.log('[ModelRepository] No models found, loading defaults...');
      return this.loadDefaults(userId);
    }
    
    // Process existing references
    const items: StoredModel[] = [];
    for (const ref of refs) {
      if (this.isVersionReference(ref) && ref.versions.length > 0) {
        const latestVersion = ref.versions[ref.versions.length - 1];
        const item = await super.getItem(userId, latestVersion.itemId);
        if (this.isVersionedObject(item)) {
          items.push(item);
        }
      }
    }
    
    console.log('[ModelRepository] Returning', items.length, 'models');
    return items;
  }

  protected async loadDefaults(userId: string): Promise<StoredModel[]> {
    console.log('[ModelRepository] Loading default models for user:', userId);
    const defaultModels = defaults.models;
    console.log('[ModelRepository] Found default models:', defaultModels?.length || 0);
    
    const storedModels: StoredModel[] = [];

    if (!defaultModels || defaultModels.length === 0) {
      console.warn('[ModelRepository] No default models found in dataIndex');
      return storedModels;
    }

    for (const model of defaultModels) {
      try {
        console.log('[ModelRepository] Processing default model:', model.name);
        
        // Create new versioned model with proper metadata
        const modelData = {
          name: model.name,
          createdBy: model.createdBy || 'system',
          type: 'model' as const,
          content: {
            dot: '',  // Will be generated from markdown if needed
            markdown: model.content
          },
          tags: model.tags || [],
          version: model.version || '1.0.0',  // Use provided version or default
          // Add required properties from StoredItem
          userId,
          dataType: this.dataType,
          updatedAt: new Date().toISOString(),
          metadata: {
            createdAt: new Date().toISOString(),
            lastModifiedAt: new Date().toISOString()
          }
        };
        
        console.log('[ModelRepository] Creating model with data:', {
          name: modelData.name,
          version: modelData.version,
          type: modelData.type,
          tags: modelData.tags
        });

        // Save using base class versioning
        await this.saveWithVersion(userId, modelData as StoredModel);
        storedModels.push(modelData as StoredModel);
      } catch (error) {
        console.error('[ModelRepository] Failed to load default model:', {
          modelName: model.name,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    console.log('[ModelRepository] Successfully loaded default models:', storedModels.length);
    return storedModels;
  }
}

// Export instances
export const systemModelRepository = ModelRepository.getInstance('system');
export const userModelRepository = ModelRepository.getInstance('user'); 