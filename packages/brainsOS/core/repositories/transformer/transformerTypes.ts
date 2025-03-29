import { StoredItem } from '../../services/storage/storageTypes';

// Base transformer interface
export interface Transformer {
    name: string;
    version: string;
    createdBy: string;
    objectType: string;
    fromView: string;
    toView: string;
    description: string;
    tags: string[];
    transformerDetails: Record<string, unknown>;
}

// Interface for stored transformer that extends StoredItem
export interface StoredTransformer extends StoredItem, Transformer {
    id: string;
    userId: string;
    dataType: string;
    updatedAt: string;
}

export const toStoredTransformer = (data: Transformer & {
    id: string;
    userId: string;
    dataType: string;
    updatedAt?: string;
}): StoredTransformer => ({
    ...data,
    id: data.id,
    userId: data.userId,
    dataType: data.dataType,
    updatedAt: data.updatedAt || new Date().toISOString()
});
