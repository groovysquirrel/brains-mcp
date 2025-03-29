import { StorageRepository } from '../base/storageRepository';
import { getStorageService } from '../../services/storage/dynamo/storageFactory';
import { defaults } from '../../../data/dataIndex';
import { userContext, getUserId } from '../../types/userTypes';
import { StoredSystemSettings, toStoredSystemSettings } from './systemTypes';
import { StoredItem } from '../../services/storage/storageTypes';

class SystemRepository extends StorageRepository<StoredSystemSettings> {
    protected typeName = 'system';
    protected dataType = 'system';
    private static instance: SystemRepository;

    private constructor() {
        super(getStorageService('system'));
    }

    static getInstance(): SystemRepository {
        if (!this.instance) {
            this.instance = new SystemRepository();
        }
        return this.instance;
    }

    static getUserInstance(): never {
        throw new Error('System settings can only be stored in system storage');
    }

    async getSettings(user: userContext): Promise<Record<string, unknown>> {
        const userId = getUserId(user);
        if (!userId) {
            throw new Error('Missing userId');
        }

        const settings = await this.getItem(userId, 'settings');
        return settings?.settings ?? {};
    }

    async updateSettings(user: userContext, settings: Record<string, unknown>): Promise<void> {
        const userId = getUserId(user);
        if (!userId) {
            throw new Error('Missing userId');
        }

        const storedSettings = toStoredSystemSettings({
            settings,
            id: 'settings',
            userId,
            dataType: this.dataType,
            updatedAt: new Date().toISOString()
        });

        await this.putItem(userId, 'settings', storedSettings);
    }

    async resetSettings(user: userContext): Promise<void> {
        const defaultSettings = {};
        await this.updateSettings(user, defaultSettings);
    }
}

// Export only system instance
export const systemRepository = SystemRepository.getInstance();

// For backwards compatibility, but mark as deprecated
/** @deprecated Use systemRepository instead */
export const systemSystemRepository = systemRepository; 