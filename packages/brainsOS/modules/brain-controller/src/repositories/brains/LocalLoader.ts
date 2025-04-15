import { BrainConfig } from '../../types/BrainConfig';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Loads brain configurations from the local file system
 */
export class LocalLoader {
    private configPath: string;

    constructor() {
         // Deployed path
         this.configPath = path.join(process.cwd(), 'brain-controller/config/defaults.json'),



        // If no path was found, use the deployed path as default
        this.configPath = path.join(process.cwd(), 'brain-controller/config/defaults.json');
        console.log('Using default config path:', this.configPath);
    }

    /**
     * Load brain configurations from the defaults.json file
     * @returns Array of brain configurations
     */
    public async loadConfigs(): Promise<BrainConfig[]> {
        try {
            const configData = JSON.parse(
                fs.readFileSync(this.configPath, 'utf-8')
            );

            if (!Array.isArray(configData.brains)) {
                throw new Error('Invalid brain configuration format: brains must be an array');
            }

            const brains = configData.brains as BrainConfig[];
            
            // Ensure default brain exists
            if (!brains.some(brain => brain.name === 'default')) {
                throw new Error('Default brain configuration is required');
            }

            return brains;
        } catch (error) {
            console.error('Failed to load brain configurations:', error);
            throw error;
        }
    }
} 