import { BaseVersionedObject } from '../repositories/base/versionedRepository';

export interface StoredModel extends BaseVersionedObject {
  type: 'model';
  content: {
    dot: string;
    markdown: string;
  };
  tags?: string[];
}

export function toStoredModel(input: Omit<StoredModel, 'type'>): StoredModel {
  return {
    ...input,
    type: 'model'
  };
} 