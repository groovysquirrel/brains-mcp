import { Logger } from '../../utils/logging/Logger';
import { recordLLMMetrics } from '../../utils/logging/MetricsCollector';
import { MCPServerConfig } from './repositories/config/ConfigRepository';
import { ToolRepository } from './repositories/services/ToolRepository';
import { ResourceRepository } from './repositories/services/ResourceRepository';
import { PromptRepository } from './repositories/services/PromptRepository';
import { TransformerRepository } from './repositories/services/TransformerRepository';
import { SystemRegistry_Tools } from './core/system/SystemToolRegistry';
import { SystemRegistry_Transformers } from './core/system/SystemTransformerRegistry';
import { LocalConfigLoader } from './repositories/config/LocalLoader';
import { v4 as uuidv4 } from 'uuid';
import {
  Tool,
  ToolInfo,
  ToolRequest,
  ToolResponse,
  Transformer,
  TransformerInfo,
  TransformerRequest,
  TransformerResult,
  MCPErrorCode
} from './types';

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
 * Interface for transformer execution requests
 */
export interface TransformerExecutionRequest {
  objectType: string;
  fromView: string;
  toView: string;
  input: any;
  requestId?: string;
}

/**
 * Interface for transformer execution responses
 */
export interface TransformerExecutionResponse {
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

    // Initialize tools and transformers
    await Promise.all([
      this.initializeTools(),
      this.initializeTransformers()
    ]);

    this.logger.info('MCPServer initialized successfully');
  }

  private async initializeTools(): Promise<void> {
    try {
      this.logger.info('Initializing built-in tools...');
      await SystemRegistry_Tools.registerBuiltInTools();
      this.logger.info('Built-in tools initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize tools:', error);
      throw error;
    }
  }

  private async initializeTransformers(): Promise<void> {
    try {
      this.logger.info('Initializing built-in transformers...');
      await SystemRegistry_Transformers.registerBuiltInTransformers();
      this.logger.info('Built-in transformers initialized successfully');
    } catch (error) {
      this.logger.error('Failed to initialize transformers:', error);
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

  public async processRequest(request: ToolRequest): Promise<ToolResponse> {
    const startTime = Date.now();
    const requestId = request.requestId || uuidv4();

    // Check for concurrent request limit
    if (this.activeRequests.size >= this.config.settings.maxConcurrentRequests) {
      return {
        success: false,
        error: {
          code: MCPErrorCode.CONCURRENT_REQUEST_LIMIT,
          message: 'Server is at maximum concurrent request capacity',
          metadata: {
            maxConcurrentRequests: this.config.settings.maxConcurrentRequests
          }
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
            code: MCPErrorCode.TOOL_NOT_FOUND,
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
      ]) as ToolResponse;

      return {
        ...result,
        metadata: {
          ...result.metadata,
          requestId
        }
      };
    } catch (error) {
      return {
        success: false,
        error: {
          code: MCPErrorCode.INTERNAL_ERROR,
          message: error instanceof Error ? error.message : 'An unexpected error occurred'
        },
        metadata: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }

  public async listTransformers(): Promise<TransformerInfo[]> {
    const transformers = await this.transformerRepository.listTransformers();
    return transformers.map(transformer => ({
      name: transformer.config.name,
      description: transformer.config.description,
      objectType: transformer.config.objectType,
      fromView: transformer.config.fromView,
      toView: transformer.config.toView,
      version: transformer.config.version
    }));
  }

  public async processTransformerRequest(request: TransformerRequest): Promise<TransformerResult> {
    const startTime = Date.now();
    const requestId = request.requestId || uuidv4();

    // Check for concurrent request limit
    if (this.activeRequests.size >= this.config.settings.maxConcurrentRequests) {
      return {
        success: false,
        error: MCPErrorCode.CONCURRENT_REQUEST_LIMIT,
        metadata: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString(),
          maxConcurrentRequests: this.config.settings.maxConcurrentRequests
        }
      };
    }

    this.activeRequests.add(requestId);

    try {
      // Find a transformation path
      const path = await this.transformerRepository.findTransformationPath(
        request.objectType,
        request.fromView,
        request.toView
      );

      if (path.length === 0) {
        // Get available transformers for this object type
        const availableTransformers = await this.transformerRepository.listTransformers();
        const relevantTransformers = availableTransformers.filter(
          t => t.config.objectType === request.objectType
        );

        // Build a helpful error message
        let errorMessage = `No transformation path found from '${request.fromView}' to '${request.toView}' for object type '${request.objectType}'`;
        
        if (relevantTransformers.length > 0) {
          const availableViews = new Set<string>();
          relevantTransformers.forEach(t => {
            availableViews.add(t.config.fromView);
            availableViews.add(t.config.toView);
          });
          
          errorMessage += `\nAvailable views for '${request.objectType}': ${Array.from(availableViews).join(', ')}`;
        } else {
          errorMessage += `\nNo transformers available for object type '${request.objectType}'`;
        }

        return {
          success: false,
          error: 'TRANSFORMER_NOT_FOUND',
          errorDetails: errorMessage,
          metadata: {
            requestId: requestId,
            processingTimeMs: Date.now() - startTime,
            timestamp: new Date().toISOString()
          }
        };
      }

      let currentInput = request.input;
      let lastResult: TransformerResult | undefined;

      // Execute each transformation in the path
      for (const step of path) {
        const { transformer } = step;

        // Validate input
        if (transformer.validate) {
          const isValid = await transformer.validate(currentInput);
          if (!isValid) {
            return {
              success: false,
              error: MCPErrorCode.INVALID_REQUEST,
              metadata: {
                requestId,
                processingTimeMs: Date.now() - startTime,
                timestamp: new Date().toISOString()
              }
            };
          }
        }

        // Process the request with timeout
        lastResult = await Promise.race([
          transformer.transform(currentInput),
          new Promise((_, reject) => 
            setTimeout(() => 
              reject(new Error(`Request timed out after ${this.config.settings.requestTimeout}ms`)),
              this.config.settings.requestTimeout
            )
          )
        ]) as TransformerResult;

        if (!lastResult.success) {
          return lastResult;
        }

        currentInput = lastResult.data;
      }

      return {
        ...lastResult!,
        metadata: {
          ...lastResult!.metadata,
          requestId,
          transformPath: path.map(step => `${step.fromView}->${step.toView}`)
        }
      };
    } catch (error) {
      return {
        success: false,
        error: MCPErrorCode.INTERNAL_ERROR,
        metadata: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      };
    } finally {
      this.activeRequests.delete(requestId);
    }
  }
} 