import { StoredItem } from './baseTypes';

export interface Version {
  version: string;
  itemId: string;
  createdAt: string;
  createdBy: string;
}

export interface VersionReference extends StoredItem {
  displayName: string;
  latestVersion: string;
  versionsCount: number;
  versions: Version[];
} 