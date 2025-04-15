import { BrainConfig } from '../../types/BrainConfig';
import { LocalLoader } from './LocalLoader';
import { DynamoDBLoader } from './DynamoDBLoader';

/**
 * Interface for brain repository implementations
 */
export interface IBrainsRepository {
    initialize(): Promise<void>;
    getBrain(name: string): Promise<BrainConfig>;
    getAllBrains(): Promise<BrainConfig[]>;
    hasBrain(name: string): Promise<boolean>;
    setBrain(brain: BrainConfig): Promise<void>;
    removeBrain(name: string): Promise<boolean>;
}

/**
 * Repository for managing brain configurations
 * Uses either local or DynamoDB storage based on configuration
 */
export class BrainsRepository implements IBrainsRepository {
    private static instance: BrainsRepository;
    private brains: Map<string, BrainConfig>;
    private loader: LocalLoader | DynamoDBLoader;

    private constructor() {
        this.brains = new Map();
        // TODO: Make loader selection configurable
        this.loader = new LocalLoader();
    }

    /**
     * Get the singleton instance of BrainsRepository
     */
    public static getInstance(): BrainsRepository {
        if (!BrainsRepository.instance) {
            BrainsRepository.instance = new BrainsRepository();
        }
        return BrainsRepository.instance;
    }

    /**
     * Initialize the repository by loading configurations
     */
    public async initialize(): Promise<void> {
        const configs = await this.loader.loadConfigs();
        this.brains.clear();
        configs.forEach(brain => {
            this.brains.set(brain.name, brain);
        });
    }

    /**
     * Get a brain configuration by name
     */
    public async getBrain(name: string): Promise<BrainConfig> {
        const brain = this.brains.get(name);
        if (!brain) {
            throw new Error(`Brain configuration not found: ${name}`);
        }
        return brain;
    }

    /**
     * Get all brain configurations
     */
    public async getAllBrains(): Promise<BrainConfig[]> {
        return Array.from(this.brains.values());
    }

    /**
     * Check if a brain exists
     */
    public async hasBrain(name: string): Promise<boolean> {
        return this.brains.has(name);
    }

    /**
     * Add or update a brain configuration
     */
    public async setBrain(brain: BrainConfig): Promise<void> {
        this.brains.set(brain.name, brain);
    }

    /**
     * Remove a brain configuration
     */
    public async removeBrain(name: string): Promise<boolean> {
        // Prevent removal of default brain
        if (name === 'default') {
            throw new Error('Cannot remove default brain configuration');
        }
        return this.brains.delete(name);
    }
} 