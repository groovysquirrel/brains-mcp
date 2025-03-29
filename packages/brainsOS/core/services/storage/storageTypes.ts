export interface StorageKey {
    partitionKey: string;  // userId
    sortKey: string;      // typeName
  }
  
  export interface StoredItem {
    userId: string;
    dataType: string;
    updatedAt: string;
  }
  
  export interface QueryOptions {
    prefix?: string;
    projection?: string[];
    filter?: Record<string, any>;
  }
  
  export interface StorageService {
    getItem<T extends StoredItem>(key: StorageKey): Promise<T | null>;
    putItem<T extends StoredItem>(key: StorageKey, item: T): Promise<void>;
    queryItems<T extends StoredItem>(partitionKey: string, options: QueryOptions): Promise<T[]>;
    deleteItem(key: StorageKey): Promise<void>;
    updateItem<T extends StoredItem>(key: StorageKey, updates: Partial<T>): Promise<void>;
    incrementCounter(key: StorageKey, field: string, initialValue?: number): Promise<number>;
  }