import { Logger } from '../../../../../utils/logging/Logger';
import { ToolRepository } from '../../../repositories/services/ToolRepository';
import { registerCalculatorTool } from './calculator/calculator';
import { registerRandomNumberTool } from './randomNumber/randomNumber';
import { registerTableConverterTool } from './tableConverter/tableConverter';

/**
 * Registry for managing built-in tools
 * This handles the registration of all built-in tools with the ToolRepository
 */
export class ToolRegistry {
  private logger: Logger;
  private toolRepository: ToolRepository;

  constructor() {
    this.logger = new Logger('ToolRegistry');
    this.toolRepository = ToolRepository.getInstance();
  }

  /**
   * Initialize and register all built-in tools
   */
  public async registerBuiltInTools(): Promise<void> {
    this.logger.info('Registering built-in tools...');

    try {
      // Register calculator tool
      await registerCalculatorTool(this.toolRepository);
      
      // Register random number tool
      await registerRandomNumberTool(this.toolRepository);
      
      // Register table converter tool
      await registerTableConverterTool(this.toolRepository);

      // Add more tool registrations here...

      this.logger.info('All built-in tools registered successfully');
    } catch (error) {
      this.logger.error('Failed to register built-in tools:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const toolRegistry = new ToolRegistry(); 