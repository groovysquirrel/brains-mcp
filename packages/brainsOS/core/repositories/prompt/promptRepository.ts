import { Resource } from "sst";
import { VersionedRepository } from '../base/versionedRepository';
import { StoredPrompt } from './promptTypes';
import { defaults } from '../../../data/dataIndex';
import { toStoredPrompt } from './promptTypes';
import { getStorageService } from '../../services/storage/dynamo/storageFactory';

interface VersionInfo {
  name: string;
  version: string;
  createdBy: string;
  metadata?: {
    createdAt?: string;
    lastModifiedAt?: string;
    [key: string]: any;
  };
}

export class PromptRepository extends VersionedRepository<StoredPrompt> {
  protected typeName = 'prompt';
  protected dataType = 'prompt';
  private static instances: Record<string, PromptRepository> = {};

  private constructor(storageType: 'user' | 'system' = 'system') {
    super(getStorageService(storageType));
  }

  static getInstance(storageType: 'user' | 'system' = 'system'): PromptRepository {
    if (!this.instances[storageType]) {
      this.instances[storageType] = new PromptRepository(storageType);
    }
    return this.instances[storageType];
  }

  /**
   * Prompt-specific operations or overrides
   */
  protected async loadDefaults(userId: string): Promise<StoredPrompt[]> {
    const defaultPrompts = defaults.prompts;
    const storedPrompts: StoredPrompt[] = [];

    for (const prompt of defaultPrompts) {
      try {
        const storedPrompt = toStoredPrompt({
          ...prompt,
          version: prompt.version || '1.0.0',
        });
        await this.save(userId, storedPrompt);
        storedPrompts.push(storedPrompt);
      } catch (error) {
        console.error(`Failed to load default prompt:`, { prompt, error });
      }
    }

    return storedPrompts;
  }
}

export const systemPromptRepository = PromptRepository.getInstance('system');
export const userPromptRepository = PromptRepository.getInstance('user'); 