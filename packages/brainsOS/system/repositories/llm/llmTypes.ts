import { StoredItem } from '../../services/storage/storageTypes';

export interface StoredLLM extends StoredItem {
  name: string;
  type: 'llm';
  description?: string;
  friendlyName?: string;
  content?: unknown;
  status?: string;
  metadata?: Record<string, unknown>;
  isDefault?: boolean;
}

export const toStoredLLM = (input: any): StoredLLM => {
  return {
    userId: input.userId || 'system',
    dataType: 'llm',
    updatedAt: new Date().toISOString(),
    name: input.name,
    type: 'llm',
    description: input.description,
    friendlyName: input.friendlyName,
    content: input.content,
    status: input.status,
    metadata: input.metadata,
    isDefault: input.isDefault,
  };
};
