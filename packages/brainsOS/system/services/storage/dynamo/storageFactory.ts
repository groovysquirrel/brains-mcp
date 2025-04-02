import { DynamoStorageService } from './dynamoStorage';
import { StorageService } from '../storageTypes';
import { Resource } from "sst";

export function getStorageService(storageType: 'user' | 'system'): StorageService {
  const tableName = storageType === 'user' ? Resource.userData.name : Resource.systemData.name;
  return new DynamoStorageService(tableName);
} 