import { StorageRepository } from './storageRepository';
import { StoredItem } from '../../services/storage/storageTypes';
import { defaults } from '../../../data/dataIndex';
import { randomUUID } from 'crypto'; 

export interface VersionedItem extends StoredItem {
  version: string;
}

export interface BaseVersionedObject extends StoredItem {
  name: string;
  version: string;
  createdBy: string;
  metadata?: {
    createdAt?: string;
    lastModifiedAt?: string;
    [key: string]: any;
  };
}

export interface Version {
  version: string;
  itemId: string;
  createdAt: string;
  createdBy: string;
}

export interface VersionReference extends StoredItem {
  
  displayName: string;
  id: string;
  latestVersion: string;
  metadata: {
    createdAt: string;
    lastModifiedAt: string;
    [key: string]: any;
  };
  versionsCount: number;
  versions: Version[];
}

/**
 * Base repository for all versioned resources (prompts, agents, etc.)
 */
export abstract class VersionedRepository<T extends BaseVersionedObject> extends StorageRepository<T | VersionReference> {
  // dataType represents the type of data (e.g., 'prompt', 'agent')
  protected abstract dataType: string;

  // typeName is used for constructing access patterns (e.g., 'prompt#name#version')
  protected getTypePrefix(): string {
    return this.dataType;
  }

  // Reference key pattern (e.g., 'ref#prompt#name')
  protected getReferenceKey(name: string): string {
    return `ref#${this.dataType}#${name}`;
  }

  // Versioned item key pattern (e.g., 'prompt#id#version')
  protected getVersionedItemKey(id: string, version: string): string {
    return `${this.dataType}#${id}#${version}`;
  }

  protected isVersionReference(item: any): item is VersionReference {
    return item && 'versions' in item && Array.isArray(item.versions);
  }

  protected isVersionedObject(item: T | VersionReference | null): item is T {
    return item !== null && !this.isVersionReference(item);
  }

  async getAll(userId: string): Promise<T[]> {
    console.log(`[VersionedRepository] Getting all items for ${this.dataType}, user:`, userId);
    
    try {
      // First get all references
      const queryPrefix = `ref#${this.dataType}#`;
      console.log(`[VersionedRepository] Querying references with prefix:`, queryPrefix);
      
      const refs = await super.queryItems(userId, queryPrefix);
      console.log(`[VersionedRepository] Found ${refs.length} references for ${userId}`);
      
      // If no references found, load defaults immediately
      if (refs.length === 0) {
        console.log(`[VersionedRepository] No references found for ${userId}, loading defaults...`);
        return this.loadDefaults(userId);
      }
      
      const items: T[] = [];
      
      for (const ref of refs) {
        console.log(`[VersionedRepository] Processing reference:`, {
          ref: this.isVersionReference(ref) ? {
            displayName: ref.displayName,
            versionsCount: ref.versionsCount,
            versions: ref.versions.map(v => v.version)
          } : 'Invalid reference'
        });
        
        if (this.isVersionReference(ref) && ref.versions.length > 0) {
          const latestVersion = ref.versions[ref.versions.length - 1];
          console.log(`[VersionedRepository] Getting latest version:`, latestVersion);
          
          const item = await super.getItem(userId, latestVersion.itemId);
          console.log(`[VersionedRepository] Retrieved item:`, item ? 'Found' : 'Not found');
          
          if (this.isVersionedObject(item)) {
            items.push(item);
          }
        }
      }
      
      console.log(`[VersionedRepository] Returning ${items.length} items`);
      return items;
    } catch (error) {
      console.error(`[VersionedRepository] Error in getAll:`, {
        error: error instanceof Error ? error.message : error,
        userId,
        dataType: this.dataType
      });
      throw error;
    }
  }

  async getOne(userId: string, name: string): Promise<T | null> {
    // Check if this is a request for a specific version
    const [baseName, version] = name.split('/');
    
    if (version) {
        // Get specific version
        const ref = await this.getReference(userId, baseName);
        if (!ref || !ref.versions[version]) return null;
        
        const item = await super.getItem(userId, `${this.dataType}#${ref.id}#${version}`);
        return this.isVersionReference(item) ? null : item;
    }
    
    // If no version specified, get latest
    return this.getLatestVersion(userId, name);
  }

  async save(userId: string, object: T): Promise<void> {
    await this.saveWithVersion(userId, object);
  }

  async delete(userId: string, name: string, version?: string): Promise<void> {
    const ref = await this.getReference(userId, name);
    if (!ref) return;
    
    if (version) {
      // Delete specific version
      console.log(`[VersionedRepository] Deleting version ${version} of ${name}`);
      
      // Delete the version content
      await super.deleteItem(userId, `${this.dataType}#${ref.id}#${version}`);
      
      // Update the reference
      ref.versions = ref.versions.filter(v => v.version !== version);
      ref.versionsCount = ref.versions.length;
      
      if (ref.versions.length === 0) {
        // If no versions left, delete the entire reference
        await super.deleteItem(userId, `ref#${this.dataType}#${name}`);
      } else {
        // Update latest version pointer if needed
        if (ref.latestVersion === version) {
          ref.latestVersion = ref.versions[ref.versions.length - 1].version;
        }
        // Save updated reference
        await super.putItem(userId, `ref#${this.dataType}#${name}`, ref);
      }
    } else {
      // Delete all versions
      for (const ver of ref.versions) {
        await super.deleteItem(userId, `${this.dataType}#${ref.id}#${ver.version}`);
      }
      // Delete the reference
      await super.deleteItem(userId, `ref#${this.dataType}#${name}`);
    }
  }

  async rename(userId: string, oldName: string, newName: string): Promise<void> {
    console.log('[VersionedRepository] Starting rename operation:', {
      userId,
      oldName,
      newName,
      dataType: this.dataType
    });

    // 1. Get the old reference
    const oldRef = await this.getReference(userId, oldName);
    if (!oldRef || !oldRef.versions.length) {
      console.error('[VersionedRepository] Resource not found:', {
        userId,
        oldName,
        dataType: this.dataType
      });
      throw new Error(`Resource not found: ${oldName}`);
    }

    console.log('[VersionedRepository] Found existing reference:', {
      oldRef,
      versionsCount: oldRef.versions.length
    });

    // 2. Create new reference with updated name and clean data
    const newRef: VersionReference = {
      id: oldRef.id,
      userId: oldRef.userId,
      dataType: oldRef.dataType,
      updatedAt: oldRef.updatedAt,
      displayName: newName,
      latestVersion: oldRef.latestVersion,
      versionsCount: oldRef.versionsCount,
      versions: oldRef.versions,
      metadata: {
        ...oldRef.metadata,
        lastModifiedAt: new Date().toISOString()
      }
    };

    // 3. Save new reference using correct key pattern
    const newRefKey = this.getReferenceKey(newName);
    console.log('[VersionedRepository] Saving new reference:', {
      key: newRefKey,
      reference: newRef
    });

    await super.putItem(userId, newRefKey, newRef);

    // 4. Delete old reference
    const oldRefKey = this.getReferenceKey(oldName);
    console.log('[VersionedRepository] Deleting old reference:', {
      key: oldRefKey
    });

    await super.deleteItem(userId, oldRefKey);

    console.log('[VersionedRepository] Rename operation completed successfully:', {
      userId,
      oldName,
      newName,
      dataType: this.dataType
    });
  }

  /**
   * Core versioning logic for saving objects
   * Maintains both versioned records and latest pointers
   */
  protected async saveWithVersion(userId: string, object: T, existingId?: string): Promise<void> {
    console.log('[VersionedRepository] Starting saveWithVersion:', {
      userId,
      objectName: object.name,
      version: object.version,
      existingId
    });

    // Get/create reference using our helper method
    const ref: VersionReference = existingId 
      ? this.createReference({
          id: existingId,
          userId,
          name: object.name,
          version: object.version,
          createdBy: object.createdBy
        })
      : await this.getReference(userId, object.name);
    
    console.log('[VersionedRepository] Current versions before update:', {
      versions: ref.versions.map(v => v.version)
    });

    // Create new version info
    const newVersion: Version = {
      version: object.version,
      itemId: `${this.dataType}#${ref.id}#${object.version}`,
      createdAt: new Date().toISOString(),
      createdBy: object.createdBy
    };

    // Only add version if it doesn't already exist
    if (!ref.versions.some(v => v.version === object.version)) {
      ref.versions.push(newVersion);
      console.log('[VersionedRepository] Added new version:', object.version);
    } else {
      console.log('[VersionedRepository] Version already exists:', object.version);
    }
    
    console.log('[VersionedRepository] Final versions after update:', {
      versions: ref.versions.map(v => v.version)
    });

    ref.latestVersion = object.version;
    ref.versionsCount = ref.versions.length;
    ref.updatedAt = new Date().toISOString();
    ref.metadata.lastModifiedAt = new Date().toISOString();

    // Save actual content
    await super.putItem(userId, newVersion.itemId, object);

    // Update reference
    await super.putItem(userId, `ref#${this.dataType}#${object.name}`, ref);
  }

  /**
   * Creates a new object with proper versioning
   */
  protected async newWithVersion(
    userId: string,
    partial: Omit<T, 'version' | 'metadata'> & { 
      metadata?: Partial<T['metadata']> 
    }
  ): Promise<T> {
    const now = new Date().toISOString();
    const nextVersion = await this.getNextVersion(userId, partial.name);
    
    // Create new object with required fields
    const newObject = {
      ...partial,
      userId,                // Add required StoredItem properties
      dataType: this.dataType,
      updatedAt: now,
      version: nextVersion,
      metadata: {
        ...partial.metadata,
        createdAt: now,
        lastModifiedAt: now
      }
    };

    return newObject as T;
  }

  /**
   * Gets the latest version of an object
   */
  protected async getLatestVersion(userId: string, name: string): Promise<T | null> {
    const ref = await this.getReference(userId, name);
    if (!ref || !ref.versions.length) return null;

    const latestVersion = ref.versions[ref.versions.length - 1];
    const item = await super.getItem(userId, latestVersion.itemId);
    return this.isVersionedObject(item) ? item : null;
  }

  /**
   * Loads default items if none exist
   */
  protected async loadDefaults(userId: string): Promise<T[]> {
    console.log(`[VersionedRepository] Loading defaults for ${this.dataType}...`);
    
    const defaultsKey = `${this.dataType}s` as keyof typeof defaults;
    console.log(`[VersionedRepository] Looking for defaults with key:`, defaultsKey);
    
    const defaultData = defaults[defaultsKey];
    console.log(`[VersionedRepository] Found default data:`, {
      hasData: !!defaultData,
      isArray: Array.isArray(defaultData),
      length: Array.isArray(defaultData) ? defaultData.length : 0
    });
    
    if (!defaultData || !Array.isArray(defaultData)) {
      console.warn(`[VersionedRepository] No valid defaults available for type: ${defaultsKey}`);
      return [];
    }

    const results: T[] = [];
    
    for (const item of defaultData) {
      console.log(`[VersionedRepository] Processing default item:`, {
        name: 'name' in item ? item.name : undefined,
        version: 'version' in item ? item.version : undefined,
        createdBy: 'createdBy' in item ? item.createdBy : undefined
      });
      
      if (!this.isValidDefaultItem(item)) {
        console.warn(`[VersionedRepository] Skipping invalid default item:`, item);
        continue;
      }

      try {
        const defaultObject = {
          ...item,
          metadata: {
            ...(item.metadata || {}),
            createdAt: item.metadata?.createdAt || new Date().toISOString(),
            lastModifiedAt: item.metadata?.lastModifiedAt || new Date().toISOString()
          }
        };

        // Safe type assertion after validation
        const typedObject = defaultObject as unknown as T;
        console.log(`[VersionedRepository] Saving default item:`, {
          name: typedObject.name,
          version: typedObject.version
        });
        
        await this.saveWithVersion(userId, typedObject);
        results.push(typedObject);
      } catch (error) {
        console.error(`[VersionedRepository] Error saving default item:`, {
          item,
          error: error instanceof Error ? error.message : error
        });
      }
    }

    console.log(`[VersionedRepository] Successfully loaded ${results.length} default items`);
    return results;
  }

  private isValidDefaultItem(item: any): item is T {
    return (
      typeof item === 'object' &&
      item !== null &&
      typeof item.name === 'string' &&
      typeof item.version === 'string' &&
      typeof item.createdBy === 'string'
    );
  }

  protected async getNextVersion(userId: string, name: string): Promise<string> {
    const versionKey = `${this.dataType}#latest#${name}#versions`;
    try {
      const counter = await this.incrementCounter(userId, versionKey, 'counter', 0);
      return `1.0.${counter}`;
    } catch (error) {
      console.error('Error getting next version:', error);
      // Fallback to timestamp-based versioning if counter fails
      return `1.0.${Date.now()}`;
    }
  }

  /**
   * Get or create reference for an object
   */
  protected async getReference(userId: string, name: string): Promise<VersionReference> {
    const ref = await super.getItem(userId, `ref#${this.dataType}#${name}`);
    if (!ref) {
      // Create new reference with ALL required StoredItem properties
      const id = randomUUID();
      const now = new Date().toISOString();
      return {
        id,
        displayName: name,
        latestVersion: '',
        versionsCount: 0,
        versions: [],
        // Add ALL required StoredItem properties
        userId,                // Required from StoredItem
        dataType: this.dataType, // Required from StoredItem
        updatedAt: now,       // Required from StoredItem
        metadata: {
          createdAt: now,
          lastModifiedAt: now
        }
      };
    }
    return ref as VersionReference;
  }

  /**
   * Get all versions of a specific item
   */
  async getVersions(userId: string, name: string): Promise<VersionReference> {
    const ref = await this.getReference(userId, name);
    return ref;
  }

  protected createReference(params: {
    id: string;
    userId: string;
    name: string;
    version?: string;
    createdBy?: string;
  }): VersionReference {
    const now = new Date().toISOString();
    const versions = params.version ? [{
      version: params.version,
      itemId: `${this.dataType}#${params.id}#${params.version}`,
      createdAt: now,
      createdBy: params.createdBy || 'system'
    }] : [];

    return {
      id: params.id,
      userId: params.userId,
      dataType: this.dataType,
      updatedAt: now,
      displayName: params.name,
      latestVersion: params.version || '',
      versionsCount: versions.length,
      versions,
      metadata: {
        createdAt: now,
        lastModifiedAt: now
      }
    };
  }
} 
