import { BrainConfig } from './types/BrainConfig';
import { BrainRequest } from './types/BrainRequest';
import { BrainResponse, createErrorResponse, createTerminalResponse, createProcessingResponse } from './types/BrainResponse';
import { BrainsRepository } from './repositories/brains/BrainsRepository';
import { Logger } from './utils/logging/Logger';
import { Gateway } from '../../llm-gateway/src/Gateway';
import { MCPServer } from '../../mcp-server/src/MCPServer';
import * as fs from 'fs';
import * as path from 'path';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Resource } from 'sst';
import { extractMCPCommands, MCPCommand } from './utils/mcpParser';
import { MCPTool, MCPTransformer, MCPPrompt, MCPResource, MCPToolRequest } from './types/MCPRequests';


/**
 * Controller for managing brain operations and conversation state
 */
export class BrainController {
    private static instance: BrainController;
    private repository: BrainsRepository;
    private logger: Logger;
    private gateway: Gateway;
    private conversationMap: Map<string, string>;
    private mcpPrompt: string;
    private brainName: string;
    private availableMCPTools: MCPTool[] = [];
    private availableMCPTransformers: MCPTransformer[] = [];
    private availableMCPPrompts: MCPPrompt[] = [];
    private availableMCPResources: MCPResource[] = [];
    private sqsClient: SQSClient;
    private mcpServer: MCPServer | null = null;

    constructor(options?: {
        repository?: BrainsRepository;
        gateway?: Gateway;
        brainName?: string;
    }) {
        this.repository = options?.repository || BrainsRepository.getInstance();
        this.logger = new Logger('BrainController');
        this.gateway = options?.gateway || new Gateway();
        this.conversationMap = new Map();
        this.brainName = options?.brainName || 'default';
        this.sqsClient = new SQSClient({});
        
        // Load MCP prompt
        try {
            const mcpPromptPath = path.join(process.cwd(), 'brain-controller/config/mcpPrompt.md');
            this.logger.info('Loading MCP prompt from:', { path: mcpPromptPath });
            
            this.mcpPrompt = fs.readFileSync(mcpPromptPath, 'utf-8');
        } catch (error) {
            this.logger.error('Failed to load MCP prompt:', error);
            this.mcpPrompt = '';
        }
    }

    /**
     * Get the singleton instance of BrainController
     */
    public static getInstance(options?: {
        repository?: BrainsRepository;
        gateway?: Gateway;
        brainName?: string;
    }): BrainController {
        if (!BrainController.instance) {
            BrainController.instance = new BrainController(options);
        }
        return BrainController.instance;
    }

    /**
     * Initialize the controller and its dependencies
     */
    public async initialize(): Promise<void> {
        try {
            await this.repository.initialize();
            const brains = await this.repository.getAllBrains();
            this.logger.info('Loaded brain configurations:', brains);
            await this.gateway.initialize('local');
            
            // Initialize the MCP server
            this.mcpServer = await MCPServer.create();
            await this.mcpServer.initialize();
            
            // Fetch available MCP components
            await this.fetchAllMCPComponents();
            
            this.logger.info('BrainController initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize BrainController:', error);
            throw error;
        }
    }

    /**
     * Fetch available MCP tools from the MCP server
     */
    private async fetchMCPTools(): Promise<void> {
        try {
            if (!this.mcpServer) {
                throw new Error('MCP Server not initialized');
            }
            
            // Get tools directly from MCPServer
            const tools = await this.mcpServer.listTools();
            
            // Adapt tools to our internal format
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
     */
    private async fetchMCPTransformers(): Promise<void> {
        try {
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
     */
    private async fetchMCPPrompts(): Promise<void> {
        try {
            if (!this.mcpServer) {
                throw new Error('MCP Server not initialized');
            }
            
            // For now, we're still accessing the promptRepository directly
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
     */
    private async fetchMCPResources(): Promise<void> {
        try {
            if (!this.mcpServer) {
                throw new Error('MCP Server not initialized');
            }
            
            // For now, we're still accessing the resourceRepository directly
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
     */
    private async fetchAllMCPComponents(): Promise<void> {
        // Fetch all components in parallel
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
     * Generate MCP commands documentation based on available tools
     */
    private generateMCPToolsDocumentation(): string {
        if (!this.availableMCPTools || this.availableMCPTools.length === 0) {
            return '';
        }
        
        let documentation = '\n\n## Available Commands\n\n';
        
        for (const tool of this.availableMCPTools) {
            documentation += `### ${tool.name}\n`;
            documentation += `${tool.description}\n\n`;
            documentation += '```json\n';
            documentation += JSON.stringify(tool.schema, null, 2);
            documentation += '\n```\n\n';
        }
        
        return documentation;
    }

    /**
     * Send an MCP request to the queue
     */
    public async sendMCPRequest(
        toolRequest: MCPToolRequest, 
        connectionId: string,
        userId?: string,
        conversationId?: string,
        commandId?: string
    ): Promise<string> {
        try {
            const requestId = toolRequest.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Send message to MCP request queue
            const queueMessage = {
                requestId,
                mcpRequest: toolRequest,
                responseChannel: connectionId,
                userId,
                conversationId,
                commandId,
                timestamp: new Date().toISOString()
            };
            
            this.logger.info('Sending MCP request to queue', {
                requestId,
                toolName: toolRequest.toolName,
                connectionId
            });
            
            await this.sqsClient.send(new SendMessageCommand({
                QueueUrl: Resource.brainsOS_mcpServerRequestQueue.url,
                MessageBody: JSON.stringify(queueMessage)
            }));
            
            this.logger.info('MCP request sent to queue successfully', { requestId });
            
            return requestId;
        } catch (error) {
            this.logger.error('Failed to send MCP request to queue:', error);
            throw error;
        }
    }

    /**
     * Get a brain configuration by name
     */
    public async getBrain(name: string): Promise<BrainConfig> {
        return this.repository.getBrain(name);
    }

    /**
     * Process a brain request and generate a response
     */
    public async processRequest(request: BrainRequest): Promise<BrainResponse> {
        try {
            const { action, data } = request;

            // Handle different action types
            switch (action) {
                case 'brain/chat':
                    return this.handleChatRequest(data);
                case 'brain/list':
                    return this.handleListRequest();
                case 'brain/get':
                    return this.handleGetRequest(data.name);
                case 'brain/mcp':
                    return this.handleMCPRequest(data);
                default:
                    return createErrorResponse(`Unsupported action: ${action}`);
            }
        } catch (error) {
            this.logger.error('Error processing request:', error);
            return createErrorResponse(error instanceof Error ? error.message : 'An unexpected error occurred');
        }
    }

    /**
     * Handle an MCP request directly
     */
    private async handleMCPRequest(data: any): Promise<BrainResponse> {
        try {
            const { connectionId, userId, toolName, parameters, conversationId, commandId } = data;
            
            if (!toolName || !parameters) {
                return createErrorResponse('Missing required fields: toolName, parameters');
            }
            
            const requestId = await this.sendMCPRequest(
                {
                    requestType: 'tool',
                    requestId: `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                    toolName,
                    parameters
                },
                connectionId,
                userId,
                conversationId,
                commandId
            );
            
            // Log the request ID
            this.logger.info(`MCP request sent with ID: ${requestId}`);
            
            // Return a processing response and add request info to metadata
            const response = createProcessingResponse();
            response.data.message = `MCP request sent with ID: ${requestId}`;
            response.data.metadata = {
                requestId,
                toolName,
                status: 'processing'
            };
            
            return response;
        } catch (error) {
            return createErrorResponse(error instanceof Error ? error.message : 'Failed to process MCP request');
        }
    }

    /**
     * Handle a chat request
     */
    private async handleChatRequest(data: any): Promise<BrainResponse> {
        const { connectionId, userId, messages } = data;

        // Get or create conversation ID
        let conversationId = this.conversationMap.get(connectionId);
        if (!conversationId) {
            conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            this.conversationMap.set(connectionId, conversationId);
            this.logger.info('Created new conversation', { connectionId, conversationId });
        }

        // Get brain configuration
        const brain = await this.repository.getBrain(this.brainName);
        this.logger.info('Using brain configuration:', { brainName: this.brainName, config: brain.config });

        // Generate MCP tools documentation
        const toolsDocumentation = this.generateMCPToolsDocumentation();

        // Format the system prompt with brain configuration and MCP prompt
        const formattedSystemPrompt = `Your name and nickname is ${brain.config.nickname}.

PERSONA: ${brain.config.persona}

${brain.config.systemPrompt}

${this.mcpPrompt}${toolsDocumentation}`;

        // Forward the request to the LLM gateway
        const gatewayResponse = await this.gateway.chat({
            provider: brain.config.provider,
            modelId: brain.config.modelId,
            conversationId,
            userId,
            messages: messages || [],
            systemPrompt: formattedSystemPrompt
        });

        this.logger.info('Received gateway response:', { 
            modelId: brain.config.modelId,
            content: gatewayResponse.content.substring(0, 200) + '...' // Log just the beginning for brevity
        });

        // Process MCP commands from the response
        const { parsedContent, extractedCommands } = await this.processMCPCommands(
            gatewayResponse.content,
            connectionId,
            userId,
            conversationId
        );

        // If commands were extracted and sent to MCP, include that info in the response
        let responseContent = gatewayResponse.content;
        if (extractedCommands.length > 0) {
            // Get tool names for logging
            const toolNames = extractedCommands.map(cmd => cmd.name).join(', ');
            this.logger.info(`Extracted and sent ${extractedCommands.length} MCP commands: ${toolNames}`, {
                conversationId,
                connectionId
            });

            // We'll keep the original response for now, as the MCP responses
            // will be sent separately through the websocket channel
            // In a future enhancement, we might want to modify this behavior
        }

        // Convert gateway response to brain response
        return createTerminalResponse(
            responseContent,
            brain.config.nickname
        );
    }

    /**
     * Handle a list request
     */
    private async handleListRequest(): Promise<BrainResponse> {
        const brains = await this.repository.getAllBrains();
        return createTerminalResponse(
            JSON.stringify(brains, null, 2),
            'system'
        );
    }

    /**
     * Handle a get request
     */
    private async handleGetRequest(name: string): Promise<BrainResponse> {
        const brain = await this.repository.getBrain(name);
        return createTerminalResponse(
            JSON.stringify(brain, null, 2),
            'system'
        );
    }

    /**
     * Handle errors and generate appropriate responses
     */
    public handleError(error: Error): BrainResponse {
        this.logger.error('BrainController error:', error);
        return createErrorResponse(error.message);
    }

    /**
     * Process MCP commands extracted from LLM response
     * 
     * @param content - The LLM response content
     * @param connectionId - The WebSocket connection ID
     * @param userId - The user ID
     * @param conversationId - The conversation ID
     * @returns The processed content and extracted commands
     */
    private async processMCPCommands(
        content: string,
        connectionId: string,
        userId?: string,
        conversationId?: string,
        commandId?: string
    ): Promise<{
        parsedContent: string;
        extractedCommands: MCPCommand[];
    }> {
        // Extract commands from the response
        const commands = extractMCPCommands(content);
        
        if (commands.length === 0) {
            this.logger.debug('No MCP commands found in response');
            return {
                parsedContent: content,
                extractedCommands: []
            };
        }
        
        // Get available tool names
        const availableToolNames = this.availableMCPTools.map(tool => tool.name);
        
        // Filter valid commands and send them to the MCP server
        const processedCommands: MCPCommand[] = [];
        
        for (const command of commands) {
            // Skip null commands
            if (!command || command.name === null) {
                continue;
            }
            
            // Check if the command is valid
            if (!availableToolNames.includes(command.name)) {
                this.logger.warn(`Invalid MCP command: ${command.name} is not available`);
                continue;
            }
            
            try {
                // Send the command to the MCP server
                await this.sendMCPRequest(
                    {
                        requestType: 'tool',
                        requestId: command.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                        toolName: command.name,
                        parameters: command.args || {}
                    },
                    connectionId,
                    userId,
                    conversationId,
                    commandId
                );
                
                // Add to processed commands
                processedCommands.push(command);
            } catch (error) {
                this.logger.error(`Failed to send MCP command ${command.name}:`, error);
            }
        }
        
        // For now, we return the original content unmodified
        // In the future, we might want to modify the content to include command status
        return {
            parsedContent: content,
            extractedCommands: processedCommands
        };
    }

    /**
     * Get the list of available MCP tools
     * @returns Array of available MCP tools
     */
    public getAvailableMCPTools(): MCPTool[] {
        return [...this.availableMCPTools];
    }

    /**
     * Get the list of available MCP transformers
     * @returns Array of available MCP transformers
     */
    public getAvailableMCPTransformers(): MCPTransformer[] {
        return [...this.availableMCPTransformers];
    }

    /**
     * Get the list of available MCP prompts
     * @returns Array of available MCP prompts
     */
    public getAvailableMCPPrompts(): MCPPrompt[] {
        return [...this.availableMCPPrompts];
    }

    /**
     * Get the list of available MCP resources
     * @returns Array of available MCP resources
     */
    public getAvailableMCPResources(): MCPResource[] {
        return [...this.availableMCPResources];
    }
} 