import { StorageService, StorageKey, StoredItem } from '../../services/storage/storageTypes';

export abstract class StorageRepository<T extends StoredItem> {
  protected abstract dataType: string;

  constructor(
    protected storage: StorageService
  ) {}

  protected normalizeKey(key: string): string {
    return key.toLowerCase().replace(/\s+/g, '_');
  }

  protected async getItem(userId: string, id: string): Promise<T | null> {
    const normalizedId = this.normalizeKey(id);
    return this.storage.getItem<T>({
      partitionKey: userId,
      sortKey: normalizedId
    });
  }

  protected async putItem(userId: string, id: string, item: T): Promise<void> {
    const normalizedId = this.normalizeKey(id);
    await this.storage.putItem<T>(
      {
        partitionKey: userId,
        sortKey: normalizedId
      },
      item
    );
  }

  protected async deleteItem(userId: string, id: string): Promise<void> {
    const normalizedId = this.normalizeKey(id);
    await this.storage.deleteItem({
      partitionKey: userId,
      sortKey: normalizedId
    });
  }

  protected async queryItems(userId: string, prefix?: string): Promise<T[]> {
    return this.storage.queryItems<T>(userId, {
      prefix: prefix || this.dataType
    });
  }

  protected async updateItem(userId: string, id: string, updates: Partial<T>): Promise<void> {
    const normalizedId = this.normalizeKey(id);
    await this.storage.updateItem<T>(
      {
        partitionKey: userId,
        sortKey: normalizedId
      },
      updates
    );
  }

  protected async incrementCounter(userId: string, id: string, field: string, initialValue: number = 0): Promise<number> {
    const normalizedId = this.normalizeKey(id);
    return this.storage.incrementCounter(
      {
        partitionKey: userId,
        sortKey: normalizedId
      },
      field,
      initialValue
    );
  }

  // ... other methods
} 