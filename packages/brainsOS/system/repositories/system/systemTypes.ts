import { StorageKey, StoredItem } from '../../services/storage/storageTypes';

// Base settings interface without storage-specific fields
export interface SystemSettingsData {
    settings: Record<string, unknown>;
}

// Interface for stored settings that explicitly extends StoredItem from storageTypes
export interface StoredSystemSettings extends StoredItem {
    settings: Record<string, unknown>;
}

// Helper function to create storage key
export const createSystemStorageKey = (userId: string, id: string): StorageKey => ({
    partitionKey: userId,
    sortKey: `system#${id}`
});

export const toStoredSystemSettings = (data: SystemSettingsData & { 
    id: string; 
    userId: string; 
    dataType: string; 
    updatedAt?: string;
}): StoredSystemSettings => ({
    ...data,
    id: data.id,
    userId: data.userId,
    dataType: data.dataType,
    updatedAt: data.updatedAt || new Date().toISOString(),
    settings: data.settings
});
