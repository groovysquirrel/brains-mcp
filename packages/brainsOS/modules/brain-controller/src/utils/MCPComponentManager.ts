import { Logger } from '../../../../shared/Logger';
import { MCPTool, MCPTransformer, MCPPrompt, MCPResource } from '../types/MCPRequests';
import { MCPServer } from '../../../mcp-server/src/MCPServer';

/**
 * Utility class for managing MCP components 
 * This separates component management logic from the BrainController
 */
export class MCPComponentManager {
    private logger: Logger;
    private mcpServer: MCPServer;
    
    /**
     * Collection of available MCP tools that can be used by the brain
     * These are commands that can be executed by the system
     */
    private availableMCPTools: MCPTool[] = [];
    
    /**
     * Collection of available MCP transformers for data conversion
     * These convert data between different formats
     */
    private availableMCPTransformers: MCPTransformer[] = [];
    
    /**
     * Collection of available MCP prompts
     * These are templates that can be used for specific scenarios
     */
    private availableMCPPrompts: MCPPrompt[] = [];
    
    /**
     * Collection of available MCP resources
     * These are static data sources that can be accessed
     */
    private availableMCPResources: MCPResource[] = [];

    constructor(mcpServer: MCPServer) {
        this.logger = new Logger('BRAIN - MCPComponentManager', 'warn');
        this.mcpServer = mcpServer;
    }

    /**
     * Initialize the component manager and fetch all components
     */
    public async initialize(): Promise<void> {
        try {
            // Fetch all components in parallel for better performance
            await this.fetchAllMCPComponents();
            
            this.logger.info('MCPComponentManager initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize MCPComponentManager:', error);
            throw error;
        }
    }

    /**
     * Fetch available MCP tools from the MCP server
     * 
     * Tools are executable commands that can perform actions like calculations,
     * fetching data, or processing information.
     */
    public async fetchMCPTools(): Promise<void> {
        try {
            // Ensure MCP server is initialized
            if (!this.mcpServer) {
                throw new Error('MCP Server not initialized');
            }
            
            // Get tools directly from MCPServer
            const tools = await this.mcpServer.listTools();
            
            // Adapt tools to our internal format for consistency
            this.availableMCPTools = tools.map(tool => ({
                name: tool.name,
                description: tool.description,
                schema: tool.schema
            }));
            
            this.logger.info('Fetched MCP tools successfully', { 
                toolCount: this.availableMCPTools.length,
                tools: this.availableMCPTools.map(t => t.name)
            });
        } catch (error) {
            this.logger.error('Failed to fetch MCP tools:', error);
            // Don't throw the error, just log it - we can still function without tool data
        }
    }

    /**
     * Fetch available MCP transformers from the MCP server
     * 
     * Transformers convert data between different formats,
     * like CSV to JSON or markdown to HTML.
     */
    public async fetchMCPTransformers(): Promise<void> {
        try {
            // Ensure MCP server is initialized
            if (!this.mcpServer) {
                throw new Error('MCP Server not initialized');
            }
            
            // Get transformers directly from MCPServer
            const transformers = await this.mcpServer.listTransformers();
            
            // Adapt transformers to our internal format
            this.availableMCPTransformers = transformers.map(t => ({
                name: t.name,
                description: t.description,
                schema: {
                    type: 'transformer',
                    objectType: t.objectType,
                    views: [t.fromView, t.toView]
                }
            }));
            
            this.logger.info('Fetched MCP transformers successfully', { 
                transformerCount: this.availableMCPTransformers.length,
                transformers: this.availableMCPTransformers.map(t => t.name)
            });
        } catch (error) {
            this.logger.error('Failed to fetch MCP transformers:', error);
            // Don't throw the error, just log it - we can still function without transformer data
        }
    }

    /**
     * Fetch available MCP prompts from the MCP server
     * 
     * Prompts are reusable templates for common LLM interactions,
     * which can be parameterized with variables.
     */
    public async fetchMCPPrompts(): Promise<void> {
        try {
            // Ensure MCP server is initialized
            if (!this.mcpServer) {
                throw new Error('MCP Server not initialized');
            }
            
            // For now, we're accessing the promptRepository directly
            // In a future refactor, MCPServer should provide a listPrompts method
            const prompts = await this.mcpServer['promptRepository'].listPrompts();
            
            // Adapt prompts to our internal format
            this.availableMCPPrompts = prompts.map(p => ({
                name: p.name,
                description: p.metadata?.description || `Prompt: ${p.name}`,
                templateText: p.content,
                parameters: p.metadata?.parameters
            }));
            
            this.logger.info('Fetched MCP prompts successfully', { 
                promptCount: this.availableMCPPrompts.length,
                prompts: this.availableMCPPrompts.map(p => p.name)
            });
        } catch (error) {
            this.logger.error('Failed to fetch MCP prompts:', error);
            // Don't throw the error, just log it - we can still function without prompt data
        }
    }

    /**
     * Fetch available MCP resources from the MCP server
     * 
     * Resources are static data sources like tables, datasets,
     * or reference materials that can be accessed by the LLM.
     */
    public async fetchMCPResources(): Promise<void> {
        try {
            // Ensure MCP server is initialized
            if (!this.mcpServer) {
                throw new Error('MCP Server not initialized');
            }
            
            // For now, we're accessing the resourceRepository directly
            // In a future refactor, MCPServer should provide a listResources method
            const resources = await this.mcpServer['resourceRepository'].listResources();
            
            // Adapt resources to our internal format
            this.availableMCPResources = resources.map(r => ({
                name: r.name,
                description: r.metadata?.description || `Resource: ${r.name}`,
                type: r.type,
                data: r.content
            }));
            
            this.logger.info('Fetched MCP resources successfully', { 
                resourceCount: this.availableMCPResources.length,
                resources: this.availableMCPResources.map(r => r.name)
            });
        } catch (error) {
            this.logger.error('Failed to fetch MCP resources:', error);
            // Don't throw the error, just log it - we can still function without resource data
        }
    }

    /**
     * Fetch all available MCP components from the MCP server
     * 
     * This is a convenience method that fetches all component types
     * in parallel for efficiency.
     */
    public async fetchAllMCPComponents(): Promise<void> {
        // Fetch all components in parallel for better performance
        await Promise.all([
            this.fetchMCPTools(),
            this.fetchMCPTransformers(),
            this.fetchMCPPrompts(),
            this.fetchMCPResources()
        ]);
        
        this.logger.info('Fetched all MCP components successfully', {
            toolCount: this.availableMCPTools.length,
            transformerCount: this.availableMCPTransformers.length,
            promptCount: this.availableMCPPrompts.length,
            resourceCount: this.availableMCPResources.length
        });
    }

    /**
     * Get the list of available MCP tools
     * @returns Array of MCP tools
     */
    public getAvailableMCPTools(): MCPTool[] {
        return this.availableMCPTools;
    }

    /**
     * Get the list of available MCP transformers
     * @returns Array of MCP transformers
     */
    public getAvailableMCPTransformers(): MCPTransformer[] {
        return this.availableMCPTransformers;
    }

    /**
     * Get the list of available MCP prompts
     * @returns Array of MCP prompts
     */
    public getAvailableMCPPrompts(): MCPPrompt[] {
        return this.availableMCPPrompts;
    }

    /**
     * Get the list of available MCP resources
     * @returns Array of MCP resources
     */
    public getAvailableMCPResources(): MCPResource[] {
        return this.availableMCPResources;
    }
} 