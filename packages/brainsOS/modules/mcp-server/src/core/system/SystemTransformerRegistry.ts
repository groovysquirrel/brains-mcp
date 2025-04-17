import { Logger } from '../../../../utils/logging/Logger';
import { TransformerRepository } from '../../repositories/services/TransformerRepository';

// DataTable transformers
import { DataTable_csvToObjectTransformer } from './transformers/DataTable/csv-object';
import { DataTable_objectToCsvTransformer } from './transformers/DataTable/object-csv';
import { DataTable_markdownToObjectTransformer } from './transformers/DataTable/md-object';
import { DataTable_objectToMarkdownTransformer } from './transformers/DataTable/object-md';
import { DataTable_objectToJsonTransformer } from './transformers/DataTable/object-json';
import { DataTable_jsonToObjectTransformer } from './transformers/DataTable/json-object';
// ITRG-BRA transformers
import { itrg_bra_markdownToObjectTransformer } from './transformers/ITRG-BRA/md-object';
import { itrg_bra_objectToDotTransformer } from './transformers/ITRG-BRA/object-dot';
import { itrg_bra_objectToCsvTransformer } from './transformers/ITRG-BRA/object-csv';

/**
 * Registry for managing built-in transformers
 * This handles the registration of all built-in transformers with the TransformerRepository
 */
export class SystemTransformerRegistry {
  private static instance: SystemTransformerRegistry;
  private transformerRepository: TransformerRepository;
  private logger: Logger;

  private constructor() {
    this.transformerRepository = TransformerRepository.getInstance();
    this.logger = new Logger('SystemTransformerRegistry');
  }

  public static getInstance(): SystemTransformerRegistry {
    if (!SystemTransformerRegistry.instance) {
      SystemTransformerRegistry.instance = new SystemTransformerRegistry();
    }
    return SystemTransformerRegistry.instance;
  }

  /**
   * Initialize and register all built-in transformers
   */
  public async registerBuiltInTransformers(): Promise<void> {
    try {
      this.logger.info('Registering built-in transformers...');

      // Register DataTable transformers
      this.logger.info('Registering DataTable transformers...');
      await this.transformerRepository.registerTransformer(DataTable_csvToObjectTransformer);
      this.logger.info(`Registered ${DataTable_csvToObjectTransformer.config.name}`);
      
      await this.transformerRepository.registerTransformer(DataTable_objectToCsvTransformer);
      this.logger.info(`Registered ${DataTable_objectToCsvTransformer.config.name}`);
      
      await this.transformerRepository.registerTransformer(DataTable_markdownToObjectTransformer);
      this.logger.info(`Registered ${DataTable_markdownToObjectTransformer.config.name}`);
      
      await this.transformerRepository.registerTransformer(DataTable_objectToMarkdownTransformer);
      this.logger.info(`Registered ${DataTable_objectToMarkdownTransformer.config.name}`);
      
      await this.transformerRepository.registerTransformer(DataTable_objectToJsonTransformer);
      this.logger.info(`Registered ${DataTable_objectToJsonTransformer.config.name}`);

      await this.transformerRepository.registerTransformer(DataTable_jsonToObjectTransformer);
      this.logger.info(`Registered ${DataTable_jsonToObjectTransformer.config.name}`);

      // Register ITRG-BRA transformers
      this.logger.info('Registering ITRG-BRA transformers...');
      await this.transformerRepository.registerTransformer(itrg_bra_markdownToObjectTransformer);
      this.logger.info(`Registered ${itrg_bra_markdownToObjectTransformer.config.name}`);
      
      await this.transformerRepository.registerTransformer(itrg_bra_objectToDotTransformer);
      this.logger.info(`Registered ${itrg_bra_objectToDotTransformer.config.name}`);
      
      await this.transformerRepository.registerTransformer(itrg_bra_objectToCsvTransformer);
      this.logger.info(`Registered ${itrg_bra_objectToCsvTransformer.config.name}`);

      this.logger.info('All built-in transformers registered successfully');
    } catch (error) {
      this.logger.error('Failed to register built-in transformers:', error);
      throw error;
    }
  }
}

export const SystemRegistry_Transformers = SystemTransformerRegistry.getInstance(); 