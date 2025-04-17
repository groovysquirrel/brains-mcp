import { VersionedRepository } from '../base/versionedRepository';
import { StoredFlow, isStoredFlow } from './flowTypes';
import { getStorageService } from '../../services/storage/dynamo/storageFactory';
import { defaults } from '../../../data/dataIndex';
import { VersionReference } from '../base/versionedRepository';

export class FlowRepository extends VersionedRepository<StoredFlow> {
  protected typeName = 'flow';
  protected dataType = 'flow';
  private static instances: Record<string, FlowRepository> = {};

  private constructor(storageType: 'user' | 'system' = 'system') {
    super(getStorageService(storageType));
  }

  static getInstance(storageType: 'user' | 'system' = 'system'): FlowRepository {
    if (!this.instances[storageType]) {
      this.instances[storageType] = new FlowRepository(storageType);
    }
    return this.instances[storageType];
  }

  protected async loadDefaults(userId: string): Promise<StoredFlow[]> {
    console.log('[FlowRepository] Loading default flows...');
    const storedFlows: StoredFlow[] = [];

    for (const flow of defaults.flows) {
      try {
        // Create new versioned flow with all required properties
        const newFlow = await this.newWithVersion(userId, {
          name: flow.name,
          createdBy: 'system',
          content: flow.content,
          description: flow.description,
          tags: flow.tags || [],
          // Add required properties from StoredItem
          userId,
          dataType: this.dataType,
          updatedAt: new Date().toISOString()
        });

        // Save using base class versioning
        await this.save(userId, newFlow);
        storedFlows.push(newFlow);
        
        console.log('[FlowRepository] Saved default flow:', flow.name);
      } catch (error) {
        console.error('[FlowRepository] Failed to load default flow:', { flow, error });
      }
    }

    return storedFlows;
  }

  // Add any flow-specific methods here
}

// Export instances
export const systemFlowRepository = FlowRepository.getInstance('system');
export const userFlowRepository = FlowRepository.getInstance('user');
