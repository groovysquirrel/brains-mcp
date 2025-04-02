// Base storage types used across all repositories
export interface StoredItem {
  id: string;
  userId: string;
  dataType: string;
  updatedAt: string;
  metadata: StorageMetadata;
}

export interface StorageMetadata {
  createdAt: string;
  lastModifiedAt: string;
  [key: string]: any;
}

export interface BaseVersionedObject extends StoredItem {
  name: string;
  version: string;
  createdBy: string;
  metadata: StorageMetadata;
} 