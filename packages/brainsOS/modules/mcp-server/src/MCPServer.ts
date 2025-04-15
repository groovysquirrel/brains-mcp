import { Logger } from '../../utils/logging/Logger';
import { recordLLMMetrics } from '../../utils/logging/MetricsCollector';
import { MCPServerConfig } from './repositories/config/ConfigRepository';
import { ToolRepository } from './repositories/services/ToolRepository';
import { ResourceRepository } from './repositories/services/ResourceRepository';
import { PromptRepository } from './repositories/services/PromptRepository';
import { TransformerRepository } from './repositories/services/TransformerRepository';
import { toolRegistry } from './core/built-in/tools/ToolRegistry';
import { LocalConfigLoader } from './repositories/config/LocalLoader';
import { v4 as uuidv4 } from 'uuid';

/**
 * Interface for tool execution requests
 */
export interface ToolExecutionRequest {
  toolName: string;
  parameters: Record<string, any>;
  requestId?: string;
}

/**
 * Interface for tool execution responses
 */
export interface ToolExecutionResponse {
  success: boolean;
  data?: any;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  metadata: {
    requestId: string;
    processingTimeMs: number;
    timestamp: string;
  };
}

/**
 * Interface for tool information
 */
export interface ToolInfo {
  name: string;
  description: string;
  schema: {
    type: string;
    function: {
      name: string;
      description: string;
      parameters: {
        type: string;
        properties: Record<string, any>;
        required?: string[];
      };
    };
  };
}

export class MCPServer {
  private static instance: MCPServer;
  private config: MCPServerConfig;
  private activeRequests: Set<string> = new Set();
  private toolRepository: ToolRepository;
  private resourceRepository: ResourceRepository;
  private promptRepository: PromptRepository;
  private transformerRepository: TransformerRepository;
  private logger: Logger;

  private constructor(config: MCPServerConfig) {
    this.config = config;
    this.toolRepository = ToolRepository.getInstance();
    this.resourceRepository = ResourceRepository.getInstance();
    this.promptRepository = PromptRepository.getInstance();
    this.transformerRepository = TransformerRepository.getInstance();
    this.logger = new Logger('MCPServer');
  }

  /**
   * Creates a new instance of MCPServer
   * @param config - Optional configuration. If not provided, default configuration will be used
   */
  public static async create(config?: MCPServerConfig): Promise<MCPServer> {
    if (!MCPServer.instance) {
      if (!config) {
        const configLoader = new LocalConfigLoader();
        config = await configLoader.getConfig();
      }
      MCPServer.instance = new MCPServer(config);
    }
    return MCPServer.instance;
  }

  public async initialize(): Promise<void> {
    this.logger.info('Initializing MCPServer');
    
    // Initialize repositories
    await Promise.all([
      this.toolRepository.initialize(),
      this.resourceRepository.initialize(),
      this.promptRepository.initialize(),
      this.transformerRepository.initialize()
    ]);

    await this.initializeTools();

    this.logger.info('MCPServer initialized successfully');
  }

  private async initializeTools(): Promise<void> {
    try {
      this.logger.info('Initializing built-in tools...');
      await toolRegistry.registerBuiltInTools();
      this.logger.info('Built-in tools initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize tools:', error);
      throw error;
    }
  }

  public async listTools(): Promise<ToolInfo[]> {
    const tools = await this.toolRepository.listTools();
    return tools.map(tool => ({
      name: tool.name,
      description: tool.description,
      schema: tool.schema
    }));
  }

  public async processRequest(request: ToolExecutionRequest): Promise<ToolExecutionResponse> {
    const startTime = Date.now();
    const requestId = request.requestId || uuidv4();

    // Check for concurrent request limit
    if (this.activeRequests.size >= this.config.settings.maxConcurrentRequests) {
      return {
        success: false,
        error: {
          code: 'CONCURRENT_REQUEST_LIMIT',
          message: 'Server is at maximum concurrent request capacity'
        },
        metadata: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    }

    this.activeRequests.add(requestId);

    try {
      const tool = await this.toolRepository.getByName(request.toolName);
      if (!tool) {
        return {
          success: false,
          error: {
            code: 'TOOL_NOT_FOUND',
            message: `Tool ${request.toolName} not found`
          },
          metadata: {
            requestId,
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      }

      // Record metrics if enabled
      if (this.config.metrics.enabled) {
        const startTimeStr = new Date().toISOString();
        await recordLLMMetrics({
          userId: request.parameters.userId,
          requestId,
          modelId: 'mcp-tool',
          provider: 'mcp',
          tokensIn: 0,
          tokensOut: 0,
          startTime: startTimeStr,
          endTime: new Date().toISOString(),
          duration: 0,
          source: 'websocket',
          success: true
        });
      }

      // Process the request with timeout
      const result = await Promise.race([
        tool.handler.handle(request.parameters),
        new Promise((_, reject) => 
          setTimeout(() => 
            reject(new Error(`Request timed out after ${this.config.settings.requestTimeout}ms`)),
            this.config.settings.requestTimeout
          )
        )
      ]) as { data: any };

      const processingTimeMs = Date.now() - startTime;

      return {
        success: true,
        data: result.data,
        metadata: {
          requestId,
          processingTimeMs,
          timestamp: new Date().toISOString()
        }
      };
    } catch (error) {
      const processingTimeMs = Date.now() - startTime;
      
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        },
        metadata: {
          requestId,
          processingTimeMs,
          timestamp: new Date().toISOString()
        }
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }
} 