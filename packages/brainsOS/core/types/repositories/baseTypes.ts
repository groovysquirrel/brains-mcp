import { StoredItem } from '../storage/baseTypes';

export interface IRepository<T extends StoredItem> {
  getItem(userId: string, id: string): Promise<T | null>;
  putItem(userId: string, id: string, item: T): Promise<void>;
  deleteItem(userId: string, id: string): Promise<void>;
  queryItems(userId: string, prefix: string): Promise<T[]>;
} 