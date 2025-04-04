import { VendorConfig } from '../types/Vendor';
import { Logger } from '../utils/logging/Logger';
import * as fs from 'fs/promises';
import * as path from 'path';

export class VendorRegistry {
  private vendors: Map<string, VendorConfig> = new Map();
  private logger: Logger;

  constructor() {
    this.logger = new Logger('vendor-registry');
  }

  async initialize(configPath: string): Promise<void> {
    try {
      const vendorFiles = await fs.readdir(path.join(configPath, 'vendors'));
      for (const file of vendorFiles) {
        if (file.endsWith('.json')) {
          const config = JSON.parse(
            await fs.readFile(path.join(configPath, 'vendors', file), 'utf-8')
          ) as VendorConfig;
          this.vendors.set(config.name, config);
        }
      }
    } catch (error) {
      this.logger.error('Failed to initialize vendor registry:', error);
      throw error;
    }
  }

  getVendor(name: string): VendorConfig {
    const vendor = this.vendors.get(name);
    if (!vendor) {
      throw new Error(`Vendor not found: ${name}`);
    }
    return vendor;
  }
} 