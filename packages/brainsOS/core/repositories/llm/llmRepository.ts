import { StorageRepository } from '../base/storageRepository';
import { defaults } from '../../../data/dataIndex';
import { getStorageService } from '../../services/storage/dynamo/storageFactory';
import { StoredLLM, toStoredLLM } from './llmTypes';

export class LLMRepository extends StorageRepository<StoredLLM> {
  protected typeName = 'llm';
  protected dataType = 'llm';
  private static instance: LLMRepository;

  private constructor() {
    // Force system storage only
    super(getStorageService('system'));
  }

  static getInstance(): LLMRepository {
    if (!this.instance) {
      this.instance = new LLMRepository();
    }
    return this.instance;
  }

  // Prevent instantiation with user storage
  static getSystemInstance(): LLMRepository {
    return this.getInstance();
  }

  // Remove user instance method entirely
  static getUserInstance(): never {
    throw new Error('LLMs can only be stored in system storage');
  }

  async getAll(userId: string): Promise<StoredLLM[]> {
    return this.getLLMs(userId);
  }

  /**
   * Get all LLMs, loading defaults if empty
   */
  async getLLMs(userId: string): Promise<StoredLLM[]> {
    const llms = await super.queryItems(userId, `${this.typeName}#`);
    
    console.log(`[DEBUG] Found ${llms.length} LLMs for ${userId}`);
    
    // If no LLMs found, try loading defaults
    if (llms.length === 0) {
      console.log(`No LLMs found for ${userId}, loading defaults...`);
      return this.loadDefaults(userId);
    }

    return llms;
  }

  /**
   * Save an LLM configuration
   */
  async saveLLM(userId: string, llm: Partial<StoredLLM>): Promise<void> {
    const storedLLM = toStoredLLM({
      ...llm,
      userId
    });
    await super.putItem(userId, storedLLM.name, storedLLM);
  }

  /**
   * Delete all LLMs for a user
   */
  async deleteLLMs(userId: string): Promise<void> {
    const llms = await this.getLLMs(userId);
    await Promise.all(
      llms.map(llm => super.deleteItem(userId, llm.name))
    );
  }

  /**
   * Load default LLMs for a new user
   */
  private async loadDefaults(userId: string): Promise<StoredLLM[]> {
    if (!defaults.llms || defaults.llms.length === 0) {
      console.log('No default LLMs configured');
      return [];
    }

    console.log('Loading default LLMs...');
    
    // Save each default LLM
    await Promise.all(
      defaults.llms.map(llm => this.saveLLM(userId, llm))
    );

    // Return the saved defaults
    return this.getLLMs(userId);
  }
}

// Export only system instance
export const llmRepository = LLMRepository.getInstance();

// For backwards compatibility, but mark as deprecated
/** @deprecated Use llmRepository instead */
export const systemLLMRepository = llmRepository; 