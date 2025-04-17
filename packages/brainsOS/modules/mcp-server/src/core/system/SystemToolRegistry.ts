import { Logger } from '../../../../utils/logging/Logger';
import { ToolRepository } from '../../repositories/services/ToolRepository';
import { calculatorTool } from '../system/tools/calculator/calculator';
import { randomNumberTool } from '../system/tools/randomNumber/randomNumber';

/**
 * Registry for managing built-in tools
 * This handles the registration of all built-in tools with the ToolRepository
 */
export class SystemToolRegistry {
  private static instance: SystemToolRegistry;
  private toolRepository: ToolRepository;
  private logger: Logger;

  private constructor() {
    this.toolRepository = ToolRepository.getInstance();
    this.logger = new Logger('SystemToolRegistry');
  }

  public static getInstance(): SystemToolRegistry {
    if (!SystemToolRegistry.instance) {
      SystemToolRegistry.instance = new SystemToolRegistry();
    }
    return SystemToolRegistry.instance;
  }

  /**
   * Initialize and register all built-in tools
   */
  public async registerBuiltInTools(): Promise<void> {
    try {
      this.logger.info('Registering built-in tools...');

      // Register calculator tool
      await this.toolRepository.registerTool(calculatorTool);
      this.logger.info('Registered tool:' + calculatorTool.name);

      // Register random number tool
      await this.toolRepository.registerTool(randomNumberTool);
      this.logger.info('Registered tool:' + randomNumberTool.name);

      

      this.logger.info('All built-in tools registered successfully');
    } catch (error) {
      this.logger.error('Failed to register built-in tools:', error);
      throw error;
    }
  }
}

export const SystemRegistry_Tools = SystemToolRegistry.getInstance(); 