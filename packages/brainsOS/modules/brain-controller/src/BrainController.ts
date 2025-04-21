import { BrainConfig } from './types/BrainConfig';
import { BrainRequest } from './types/BrainRequest';
import { BrainResponse, createErrorResponse, createTerminalResponse, createProcessingResponse } from './types/BrainResponse';
import { BrainsRepository } from './repositories/brains/BrainsRepository';
import { Logger } from '../../../shared/Logger';
import { Gateway } from '../../llm-gateway/src/Gateway';
import { MCPServer } from '../../mcp-server/src/MCPServer';
import * as fs from 'fs';
import * as path from 'path';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { Resource } from 'sst';
import { extractMCPCommands, isValidCommand, MCPCommand, cleanResponseContent } from './utils/MCPParser';
import { MCPTool, MCPTransformer, MCPPrompt, MCPResource, MCPToolRequest } from './types/MCPRequests';
import { MCPComponentManager } from './utils/MCPComponentManager';
import { MCPPromptBuilder } from './utils/MCPPromptBuilder';

/**
 * BrainController - Central controller for managing AI brain operations
 * 
 * This class serves as the core controller for the AI brain system. It:
 * 1. Manages communication between the frontend terminal and LLM backend
 * 2. Handles conversation state and context
 * 3. Integrates with MCP (Model Context Protocol) for tool execution
 * 4. Processes and routes user requests to appropriate handlers
 * 
 * The controller follows a singleton pattern to ensure only one instance exists
 * throughout the application lifecycle.
 */
export class BrainController {
    // -------------------------------------------------------------------------
    // Private static properties
    // -------------------------------------------------------------------------
    
    /**
     * Singleton instance of the BrainController
     * This ensures we only have one instance of the controller throughout the application
     */
    private static instance: BrainController;
    
    // -------------------------------------------------------------------------
    // Private instance properties
    // -------------------------------------------------------------------------
    
    /**
     * Repository for accessing brain configurations
     * This allows us to load and manage different brain configurations
     */
    private repository: BrainsRepository;
    
    /**
     * Logger for recording events and debugging
     * Helps track system activity and troubleshoot issues
     */
    private logger: Logger;
    
    /**
     * Gateway for communicating with the language model
     * Manages sending requests to the LLM and receiving responses
     */
    private gateway: Gateway;
    
    /**
     * Connection manager for WebSocket communication
     * Used to send messages directly to connected clients
     */
    private connectionManager: any;
    
    /**
     * Map to track active conversations by connection ID
     * Key: Connection ID
     * Value: Conversation ID
     */
    private conversationMap: Map<string, string>;
    
    /**
     * The MCP prompt template used to format system prompts
     * This defines how the AI should interpret and respond to MCP commands
     */
    private mcpPrompt: string;
    
    /**
     * The current brain name (configuration) being used
     * Default is 'default' if not specified
     */
    private brainName: string;
    
    /**
     * Manager for MCP components (tools, transformers, prompts, resources)
     */
    private componentManager: MCPComponentManager;
    
    /**
     * Utility for building MCP prompts and documentation
     */
    private promptBuilder: MCPPromptBuilder;
    
    /**
     * AWS SQS client for sending asynchronous messages
     * Used to queue MCP commands for processing
     */
    private sqsClient: SQSClient;
    
    /**
     * Reference to the MCP server instance
     * Provides access to MCP functionality
     */
    private mcpServer: MCPServer | null = null;
    
    /**
     * URL of the MCP request queue in SQS
     * Where MCP command requests are sent for processing
     */
    private mcpRequestQueueUrl: string | undefined;

    // Add a private property to track initialization status
    private initialized: boolean = false;

    // -------------------------------------------------------------------------
    // Constructor & initialization
    // -------------------------------------------------------------------------
    
    /**
     * Private constructor for BrainController (singleton pattern)
     * 
     * The constructor is private to prevent direct instantiation.
     * Use BrainController.getInstance() instead.
     * 
     * @param options - Optional configuration for the controller
     */
    constructor(options?: {
        repository?: BrainsRepository;
        gateway?: Gateway;
        brainName?: string;
        connectionManager?: any;
    }) {
        // Initialize dependencies with provided options or defaults
        this.repository = options?.repository || BrainsRepository.getInstance();
        this.logger = new Logger('BrainController', 'warn');
        this.gateway = options?.gateway || new Gateway();
        this.connectionManager = options?.connectionManager;
        this.conversationMap = new Map();
        this.brainName = options?.brainName || 'default';
        this.sqsClient = new SQSClient({});
        
        // Initialize utility classes (will be fully set up during initialize())
        this.promptBuilder = new MCPPromptBuilder();
        
        // Load MCP prompt from file
        try {
            // Try multiple paths to find the MCP prompt file
            let mcpPromptPath = path.join(process.cwd(), 'brain-controller/config/mcpPrompt.md');
            
            this.logger.info('Loading MCP prompt from:', { path: mcpPromptPath });
            
            if (fs.existsSync(mcpPromptPath)) {
                this.mcpPrompt = fs.readFileSync(mcpPromptPath, 'utf-8');
                this.logger.info('MCP prompt loaded successfully');
            } else {
                // Try an alternative path
                mcpPromptPath = path.join(__dirname, '../config/mcpPrompt.md');
                
                if (fs.existsSync(mcpPromptPath)) {
                    this.mcpPrompt = fs.readFileSync(mcpPromptPath, 'utf-8');
                    this.logger.info('MCP prompt loaded successfully from alternate path');
                } else {
                    throw new Error(`MCP prompt file not found at: ${mcpPromptPath}`);
                }
            }
        } catch (error) {
            this.logger.error('Failed to load MCP prompt:', error);
            this.mcpPrompt = ''; // Use empty prompt as fallback
        }

        // For now, we'll use environment variables or default for the queue URL
        this.mcpRequestQueueUrl = Resource.brainsOS_queue_mcp_server_request.url;
        
        if (this.mcpRequestQueueUrl) {
            this.logger.info('Using MCP request queue from environment:', { url: this.mcpRequestQueueUrl });
        } else {
            this.logger.warn('MCP request queue URL not found in environment, SQS message sending will be disabled');
        }
    }

    /**
     * Get the singleton instance of BrainController
     * 
     * This is the main entry point for accessing the BrainController.
     * It ensures only one instance exists throughout the application.
     * 
     * @param options - Optional configuration for the controller
     * @returns The singleton BrainController instance
     */
    public static getInstance(options?: {
        repository?: BrainsRepository;
        gateway?: Gateway;
        brainName?: string;
        connectionManager?: any;
    }): BrainController {
        if (!BrainController.instance) {
            BrainController.instance = new BrainController(options);
        }
        return BrainController.instance;
    }

    /**
     * Initialize the controller and its dependencies
     * 
     * This method must be called after creating the controller
     * to ensure all dependencies are properly loaded and ready.
     * 
     * @returns Promise that resolves when initialization is complete
     */
    public async initialize(): Promise<void> {
        try {
            // Skip if already initialized
            if (this.initialized) {
                this.logger.info('BrainController already initialized, skipping');
                return;
            }

            this.logger.info('Initializing BrainController...');
            
            // Initialize the brain repository
            await this.repository.initialize();
            const brains = await this.repository.getAllBrains();
            this.logger.info('Loaded brain configurations:', { brains });
            
            // Initialize the LLM gateway
            await this.gateway.initialize('local');
            
            // Initialize the MCP server
            this.mcpServer = await MCPServer.create();
            await this.mcpServer.initialize();
            
            // Initialize the component manager with the MCP server
            this.componentManager = new MCPComponentManager(this.mcpServer);
            await this.componentManager.initialize();
            
            this.initialized = true;
            this.logger.info('BrainController initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize BrainController:', error);
            throw error;
        }
    }

    /**
     * Ensure the controller is initialized before proceeding
     * 
     * @returns Promise that resolves when initialization is complete
     */
    public async ensureInitialized(): Promise<void> {
        if (!this.initialized) {
            this.logger.info('BrainController not initialized, initializing now');
            await this.initialize();
        }
    }

    /**
     * Set the connection manager instance
     * 
     * This allows updating the connection manager reference after initialization
     * 
     * @param connectionManager - The connection manager instance to use
     */
    public setConnectionManager(connectionManager: any): void {
        this.connectionManager = connectionManager;
        this.logger.info('Connection manager updated');
    }

    // -------------------------------------------------------------------------
    // MCP Documentation & Communication
    // -------------------------------------------------------------------------
    
    /**
     * Send an MCP request to the queue for processing
     * 
     * This method packages up an MCP tool request and sends it to the SQS queue
     * for asynchronous processing by the MCP server.
     * 
     * @param toolRequest - The MCP tool request to send
     * @param connectionId - The WebSocket connection ID for routing the response
     * @param userId - Optional user ID for tracking/authentication
     * @param conversationId - Optional conversation ID for context
     * @param commandId - Optional command ID from the original request
     * @param brainName - Optional brain name for context (defaults to this.brainName)
     * @returns The generated request ID
     */
    public async sendMCPRequest(
        toolRequest: MCPToolRequest, 
        connectionId: string,
        userId?: string,
        conversationId?: string,
        commandId?: string,
        brainName?: string
    ): Promise<string> {
        try {
            // Generate a unique request ID if not provided
            const requestId = toolRequest.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create the complete message for the queue
            const queueMessage = {
                requestId,
                mcpRequest: toolRequest,
                responseChannel: connectionId,
                userId,
                conversationId,
                commandId,
                timestamp: new Date().toISOString(),
                brainName: brainName || this.brainName
            };
            
            this.logger.info('Sending MCP request to queue', {
                requestId,
                toolName: toolRequest.toolName,
                connectionId
            });
            
            // Ensure queue URL is configured
            if (!this.mcpRequestQueueUrl) {
                throw new Error('MCP request queue URL is not configured');
            }
            
            // Send the message to the SQS queue
            await this.sqsClient.send(new SendMessageCommand({
                QueueUrl: this.mcpRequestQueueUrl,
                MessageBody: JSON.stringify(queueMessage)
            }));
            
            this.logger.info('MCP request sent to queue successfully', { requestId });
            
            // Return the request ID for tracking
            return requestId;
        } catch (error) {
            this.logger.error('Failed to send MCP request to queue:', error);
            throw error;
        }
    }

    // -------------------------------------------------------------------------
    // Request Processing & Routing
    // -------------------------------------------------------------------------
    
    /**
     * Process an incoming request
     * 
     * This is the main entry point for the controller. It validates the request,
     * determines the appropriate handler, and processes the request accordingly.
     * 
     * @param request - The incoming brain request
     * @returns A formatted response
     */
    public async processRequest(request: BrainRequest): Promise<BrainResponse> {
        try {
            // Ensure the controller is initialized
            await this.ensureInitialized();
            
            this.logger.info(`Processing ${request.action} request`);
            
            // Map legacy action types to new types
            const actionType = this.mapActionType(request.action);
            
            // Route the request to the appropriate handler
            switch (actionType) {
                case 'brain/terminal/request':
                case 'brain/chat/request':
                    return this.handleChatRequest(request.data);
                case 'brain/list/request':
                    return this.handleListRequest();
                case 'brain/get/request':
                    return this.handleGetRequest(request.data.brainName || 'default');
                case 'brain/mcp/request':
                    return this.handleMCPRequest(request.data);
                default:
                    throw new Error(`Unsupported action type: ${actionType}`);
            }
        } catch (error) {
            return this.handleError(error instanceof Error ? error : new Error(String(error)));
        }
    }

    /**
     * Maps legacy action types to new action types
     * @param action The action type to map
     * @returns The mapped action type
     */
    private mapActionType(action: string): string {
        // Map legacy action types to new action types
        const actionMap: Record<string, string> = {
            'brain/terminal': 'brain/terminal/request',
            'brain/chat': 'brain/chat/request',
            'brain/list': 'brain/list/request',
            'brain/get': 'brain/get/request',
            'brain/mcp': 'brain/mcp/request'
        };

        return actionMap[action] || action;
    }

    /**
     * Handle an MCP request directly
     * 
     * This method processes requests that are explicitly intended to execute
     * an MCP command, rather than extracting commands from an LLM response.
     * 
     * @param data - The MCP request data
     * @returns A processing response with status information
     */
    private async handleMCPRequest(data: any): Promise<BrainResponse> {
        try {
            const { connectionId, userId, toolName, parameters, conversationId, commandId, brainName } = data;
            
            // Validate required fields
            if (!toolName || !parameters) {
                return createErrorResponse('Missing required fields: toolName, parameters');
            }
            
            // Send the MCP request to the queue
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
                commandId,
                brainName || this.brainName
            );
            
            // Log the request ID for troubleshooting
            this.logger.info(`MCP request sent with ID: ${requestId}`);
            
            // Create a processing response with metadata
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
     * Handle a list request to show available brains
     * 
     * @returns A formatted list of all available brains
     */
    private async handleListRequest(): Promise<BrainResponse> {
        const brains = await this.repository.getAllBrains();
        return createTerminalResponse(
            JSON.stringify(brains, null, 2),
            'system'
        );
    }

    /**
     * Handle a get request to retrieve a specific brain
     * 
     * @param name - The name of the brain to retrieve
     * @returns A formatted brain configuration
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
     * 
     * @param error - The error to handle
     * @returns A formatted error response
     */
    public handleError(error: Error): BrainResponse {
        this.logger.error('BrainController error:', { 
            error: {
                message: error.message,
                name: error.name,
                stack: error.stack
            } 
        });
        return createErrorResponse(error.message);
    }

    // -------------------------------------------------------------------------
    // Chat Processing & MCP Command Extraction
    // -------------------------------------------------------------------------
    
    /**
     * Handle a chat request from the terminal or API
     * 
     * This method manages the full lifecycle of a chat interaction:
     * 1. Maintains conversation context and history
     * 2. Loads the appropriate brain configuration
     * 3. Formats system prompts with MCP documentation
     * 4. Sends the request to the LLM gateway
     * 5. Processes and extracts any MCP commands from the response
     * 6. Formats and returns the final response
     * 
     * @param data - The chat request data
     * @returns A formatted response for the terminal
     */
    private async handleChatRequest(data: any): Promise<BrainResponse> {
        const { connectionId, userId, messages, conversationId: providedConversationId } = data;

        try {
            // Ensure we're initialized before proceeding
            await this.ensureInitialized();

            // STEP 1: Manage conversation context
            // -----------------------------------
            
            // First check if the client provided a conversationId
            let conversationId = providedConversationId;
            
            // If no conversationId was provided, check the mapping or generate a new one
            if (!conversationId) {
                // Get from mapping if it exists
                conversationId = this.conversationMap.get(connectionId);
                
                // Generate a new one if we don't have one yet
                if (!conversationId) {
                    conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                    this.logger.info('Created new conversation', { connectionId, conversationId });
                }
            }
            
            // Update the mapping with the current conversationId
            this.conversationMap.set(connectionId, conversationId);
            this.logger.info('Using conversation', { connectionId, conversationId, providedByClient: !!providedConversationId });

            // STEP 2: Load brain configuration
            // --------------------------------
            
            // Get the appropriate brain configuration
            const brain = await this.repository.getBrain(this.brainName);
            this.logger.info('Using brain configuration', { 
                brainName: this.brainName, 
                modelId: brain.config.modelId,
                provider: brain.config.provider
            });

            // STEP 3: Prepare the system prompt
            // --------------------------------
            
            // Get MCP components from the component manager
            const tools = this.componentManager.getAvailableMCPTools();
            const transformers = this.componentManager.getAvailableMCPTransformers();
            const prompts = this.componentManager.getAvailableMCPPrompts();
            const resources = this.componentManager.getAvailableMCPResources();
            
            // Generate documentation for MCP components
            const mcpDocumentation = this.promptBuilder.generateMCPDocumentation(
                tools, transformers, prompts, resources
            );
            this.logger.info('Generated MCP documentation', { 
                documentationLength: mcpDocumentation.length 
            });

            // Format the system prompt with brain config and MCP documentation
            const formattedSystemPrompt = this.promptBuilder.formatSystemPrompt(
                brain.config.nickname,
                brain.config.persona,
                brain.config.systemPrompt,
                this.mcpPrompt,
                mcpDocumentation
            );

            // STEP 4: Send request to LLM gateway
            // ----------------------------------
            
            this.logger.info('Sending request to LLM gateway', {
                messageCount: messages ? messages.length : 0,
                connectionId,
                conversationId
            });
            
            // Get response from the LLM gateway
            const gatewayResponse = await this.gateway.chat({
                provider: brain.config.provider,
                modelId: brain.config.modelId,
                conversationId,
                userId,
                messages: messages || [],
                systemPrompt: formattedSystemPrompt
            });

            this.logger.info('Received gateway response', { 
                modelId: brain.config.modelId,
                contentLength: gatewayResponse.content.length,
                contentPreview: gatewayResponse.content.substring(0, 50) + '...' // Log just the beginning for brevity
            });

            // STEP 5: Process MCP commands
            // ----------------------------
            
            // Extract the command ID from the original request. It MUST be present.
            const commandId = data.commandId;
            if (!commandId) {
                const errorMsg = 'Critical Error: commandId is missing from chat request data';
                this.logger.error(errorMsg, { connectionId, userId, conversationId });
                // Optionally, throw an error to prevent further processing without a commandId
                throw new Error(errorMsg); 
                // Or return an error response immediately:
                // return createErrorResponse(errorMsg, 'system');
            }
            
            this.logger.info('Processing command with ID', { commandId }); // Log the commandId being used

            // Process any MCP commands from the response
            const { parsedContent, extractedCommands } = await this.processMCPCommands(
                gatewayResponse.content,
                connectionId,
                userId,
                conversationId,
                commandId
            );

            // STEP 6: Format and return response
            // ---------------------------------
            
            // Add debug logging to see what we're getting from the LLM gateway
            this.logger.debug('Raw LLM gateway response content:', {
                contentLength: gatewayResponse.content.length,
                conversationId,
                connectionId
            });
            
            // Log detailed analysis of the LLM response
            this.logLLMResponseDetails(gatewayResponse.content, conversationId, connectionId);
            
            // Clean the response content for the client
            const cleanedContent = this.cleanResponseForClient(gatewayResponse.content);
            
            // Log a comparison of original vs cleaned content
            if (gatewayResponse.content.length !== cleanedContent.length) {
                this.logger.info('Response content comparison:', {
                    originalLength: gatewayResponse.content.length,
                    cleanedLength: cleanedContent.length,
                    diffBytes: gatewayResponse.content.length - cleanedContent.length,
                    originalSample: gatewayResponse.content.substring(0, 100) + '...',
                    cleanedSample: cleanedContent.substring(0, 100) + '...'
                });
            }
            
            // If commands were extracted, log the information
            if (extractedCommands.length > 0) {
                // Get tool names for logging and user notification
                const toolNames = extractedCommands.map(cmd => cmd.name).join(', ');
                
                this.logger.info(`Extracted and processing ${extractedCommands.length} MCP commands: ${toolNames}`, {
                    conversationId,
                    connectionId,
                    commandCount: extractedCommands.length
                });

                // We keep the original response as-is since command results 
                // will be sent separately through the websocket channel
                // In a future enhancement, we might append status information
            }

            // Return the formatted response with cleaned content
            return createTerminalResponse(
                cleanedContent,
                brain.config.nickname,
                commandId,
                conversationId
            );
        } catch (error) {
            this.logger.error('Error handling chat request:', error);
            return createErrorResponse(
                error instanceof Error ? error.message : 'Failed to process chat request'
            );
        }
    }

    /**
     * Process MCP commands extracted from LLM response
     * 
     * This method performs several critical steps:
     * 1. Extracts JSON-formatted commands from the LLM response
     * 2. Validates commands against available tools
     * 3. Sends valid commands to the MCP server via SQS
     * 4. Records processed commands for tracking
     * 
     * @param content - The raw LLM response content
     * @param connectionId - The WebSocket connection ID for response routing
     * @param userId - The user ID for authentication/tracking
     * @param conversationId - The conversation ID for context
     * @param commandId - The original command ID that generated this response
     * @returns The processed content and list of extracted commands
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
        // STEP 1: Extract commands from the response
        // -----------------------------------------
        
        this.logger.info('Extracting MCP commands from response', {
            responseLength: content.length,
            contentPreview: content.substring(0, 100) + '...' // Log just a preview
        });
        
        // If a conversation ID is provided, ensure it's registered in the conversation map
        if (conversationId) {
            // Register the mapping to ensure response handlers can find it
            this.registerConversationMapping(connectionId, conversationId);
        }

        // Extract any MCP commands from the content
        const commands = extractMCPCommands(content);
        
        // If no commands found, return early
        if (commands.length === 0) {
            this.logger.info('No MCP commands found in response');
            return {
                parsedContent: content, // Return original content
                extractedCommands: []
            };
        }
        
        // Log the extracted commands
        this.logger.info('Extracted MCP commands', {
            commandCount: commands.length,
            commands: commands.map(cmd => ({
                name: cmd.name,
                argsCount: Object.keys(cmd.args || {}).length
            }))
        });
        
        // STEP 2: Validate and process commands
        // ------------------------------------
        
        // Get available tool names for validation
        const availableToolNames = this.componentManager.getAvailableMCPTools().map(tool => tool.name);
        
        // Track successfully processed commands
        const processedCommands: MCPCommand[] = [];
        
        // Process each command
        for (const command of commands) {
            // Skip null commands
            if (!command || command.name === null) {
                this.logger.info('Skipping null command');
                continue;
            }
            
            // Validate the command exists in available tools
            if (!availableToolNames.includes(command.name)) {
                this.logger.warn(`Invalid MCP command: "${command.name}" is not available`, {
                    availableTools: availableToolNames
                });
                
                // Send a status message that the command was invalid
                await this.sendStatusMessage(
                    connectionId,
                    'brain/terminal/status/mcp',
                    {
                        commandId,
                        requestId: command.requestId || `req_${Date.now()}`,
                        status: 'invalid',
                        message: `Command "${command.name}" not found in available tools`,
                        toolName: command.name,
                        availableTools: availableToolNames
                    }
                );
                
                continue;
            }
            
            try {
                // Generate a unique request ID for tracking
                const requestId = command.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
                
                this.logger.info('Processing MCP command', {
                    toolName: command.name,
                    requestId,
                    argsCount: Object.keys(command.args || {}).length,
                    args: command.args
                });
                
                // Send a status message that we're processing the command
                await this.sendStatusMessage(
                    connectionId,
                    'brain/terminal/status/mcp',
                    {
                        commandId,
                        requestId,
                        status: 'processing',
                        message: `Processing command "${command.name}"`,
                        toolName: command.name
                    }
                );
                
                // STEP 3: Send the command to the MCP server via SQS
                // ------------------------------------------------
                
                await this.sendMCPRequest(
                    {
                        requestType: 'tool',
                        requestId,
                        toolName: command.name,
                        parameters: command.args || {}
                    },
                    connectionId,
                    userId,
                    conversationId,
                    commandId,
                    this.brainName
                );
                
                this.logger.info('Successfully sent MCP command to queue', {
                    toolName: command.name,
                    requestId
                });
                
                // Send a status message that the command was sent to the queue
                await this.sendStatusMessage(
                    connectionId,
                    'brain/terminal/status/mcp',
                    {
                        commandId,
                        requestId,
                        status: 'queued',
                        message: `Command "${command.name}" sent to MCP queue`,
                        toolName: command.name
                    }
                );
                
                // Add to processed commands with the request ID
                processedCommands.push({
                    ...command,
                    requestId
                });
            } catch (error) {
                this.logger.error(`Failed to send MCP command "${command.name}":`, error);
                
                // Send a status message that the command failed
                await this.sendStatusMessage(
                    connectionId,
                    'brain/terminal/status/mcp',
                    {
                        commandId,
                        requestId: command.requestId || `req_${Date.now()}`,
                        status: 'failed',
                        message: `Failed to send command "${command.name}" to MCP queue: ${error instanceof Error ? error.message : String(error)}`,
                        toolName: command.name
                    }
                );
            }
        }
        
        // STEP 4: Return results
        // ---------------------
        
        // For now, we return the original content unmodified
        // In the future, we might want to modify the content to include command status
        return {
            parsedContent: content,
            extractedCommands: processedCommands
        };
    }

    /**
     * Send a status message to the client about MCP command processing
     * 
     * @param connectionId - WebSocket connection ID
     * @param action - The status action type
     * @param data - Status data to include in the message
     */
    private async sendStatusMessage(
        connectionId: string,
        action: string,
        data: Record<string, any>
    ): Promise<void> {
        try {
            // Check if connection manager is available
            if (!this.connectionManager) {
                this.logger.warn('Connection manager not available, cannot send status message', { 
                    action,
                    connectionId
                });
                return;
            }
            
            // Send the status message
            await this.connectionManager.sendMessage(connectionId, {
                action: action,
                data: {
                    ...data,
                    timestamp: new Date().toISOString()
                }
            });
            
            //this.logger.debug(`Sent status message: ${action}`, { connectionId });

        } catch (error) {
            this.logger.error(`Failed to send status message: ${action}`, {
                error: error instanceof Error ? error.message : String(error),
                connectionId
            });
        }
    }

    /**
     * Get the list of available MCP tools
     * @returns Array of MCP tools
     */
    public getAvailableMCPTools(): MCPTool[] {
        if (!this.initialized) {
            this.logger.warn('BrainController not initialized when getting MCP tools');
            // Don't block the call, but log warning
        }
        return this.componentManager.getAvailableMCPTools();
    }

    /**
     * Get the list of available MCP transformers
     * @returns Array of MCP transformers
     */
    public getAvailableMCPTransformers(): MCPTransformer[] {
        if (!this.initialized) {
            this.logger.warn('BrainController not initialized when getting MCP transformers');
            // Don't block the call, but log warning
        }
        return this.componentManager.getAvailableMCPTransformers();
    }

    /**
     * Get the list of available MCP prompts
     * @returns Array of MCP prompts
     */
    public getAvailableMCPPrompts(): MCPPrompt[] {
        if (!this.initialized) {
            this.logger.warn('BrainController not initialized when getting MCP prompts');
            // Don't block the call, but log warning
        }
        return this.componentManager.getAvailableMCPPrompts();
    }

    /**
     * Get the list of available MCP resources
     * @returns Array of MCP resources
     */
    public getAvailableMCPResources(): MCPResource[] {
        if (!this.initialized) {
            this.logger.warn('BrainController not initialized when getting MCP resources');
            // Don't block the call, but log warning
        }
        return this.componentManager.getAvailableMCPResources();
    }

    /**
     * Explicitly register a connection ID to conversation ID mapping
     * This is useful for ensuring conversation continuity across different handlers
     * 
     * @param connectionId - The WebSocket connection ID
     * @param conversationId - The conversation ID to map to
     */
    public registerConversationMapping(connectionId: string, conversationId: string): void {
        if (!this.initialized) {
            this.logger.warn('BrainController not initialized when registering conversation mapping');
            // Don't block the call, but log warning - this is critical for functionality
        }
        
        if (!connectionId || !conversationId) {
            this.logger.warn('Attempted to register invalid conversation mapping', {
                connectionId,
                conversationId
            });
            return;
        }
        
        this.conversationMap.set(connectionId, conversationId);
        this.logger.info('Registered conversation mapping', {
            connectionId,
            conversationId,
            totalMappings: this.conversationMap.size
        });
    }

    // Add a new method to clean the response content for the client
    private cleanResponseForClient(content: string): string {
        // Use the enhanced cleanResponseContent function to handle all token types
        let cleaned = cleanResponseContent(content);
        
        // Log what was cleaned
        const cleaningDiff = content.length - cleaned.length;
        if (cleaningDiff > 0) {
            this.logger.info('Cleaned LLM response for client', {
                originalLength: content.length,
                cleanedLength: cleaned.length,
                cleanedBytes: cleaningDiff
            });
        }
        
        return cleaned;
    }

    private logLLMResponseDetails(content: string, conversationId: string, connectionId: string): void {
        // Log the full content for detailed analysis during debugging
        this.logger.debug('======= LLM RESPONSE DETAIL START =======');
        
        // Check for special tokens and report their presence
        const assistantTokens = (content.match(/<\|assistant\|>/g) || []).length;
        const userTokens = (content.match(/<\|user\|>/g) || []).length;
        const otherSpecialTokens = (content.match(/<\|[^>]+\|>/g) || [])
            .filter(token => token !== '<|assistant|>' && token !== '<|user|>')
            .join(', ');
        
        this.logger.debug('LLM Response Token Analysis:', {
            conversationId,
            connectionId,
            contentLength: content.length,
            assistantTokenCount: assistantTokens,
            userTokenCount: userTokens,
            otherSpecialTokens,
            contentPreview: content.substring(0, 200) + (content.length > 200 ? '...' : '')
        });
        
        // Create a mapping of all special token positions to identify where they appear
        const tokenPositions: {token: string, position: number}[] = [];
        const tokenRegex = /<\|[^>]+\|>/g;
        let match;
        
        while ((match = tokenRegex.exec(content)) !== null) {
            tokenPositions.push({
                token: match[0],
                position: match.index
            });
        }
        
        if (tokenPositions.length > 0) {
            this.logger.debug('Special token positions in response:', {
                positions: tokenPositions.slice(0, 10), // Limit to first 10 for brevity
                totalTokens: tokenPositions.length
            });
            
            // If we have assistant tokens specifically, log more details about them
            if (assistantTokens > 0) {
                this.logAssistantTokenDetails(content, conversationId);
            }
        }
        
        this.logger.debug('======= LLM RESPONSE DETAIL END =======');
    }
    
    /**
     * Log detailed information about assistant tokens in the response
     * This helps debug issues with <|assistant|> tokens appearing in the output
     */
    private logAssistantTokenDetails(content: string, conversationId: string): void {
        // Find all instances of assistant tokens
        const assistantRegex = /<\|assistant\|>/g;
        const positions: number[] = [];
        let match;
        
        while ((match = assistantRegex.exec(content)) !== null) {
            positions.push(match.index);
        }
        
        if (positions.length === 0) return;
        
        // For each position, extract surrounding context to see what's happening
        const contextEntries = positions.map((position, index) => {
            const start = Math.max(0, position - 30);
            const end = Math.min(content.length, position + 30);
            const before = content.substring(start, position);
            const after = content.substring(position + 13, end); // 13 is length of <|assistant|>
            
            return {
                tokenIndex: index + 1,
                position,
                contextBefore: before,
                token: '<|assistant|>',
                contextAfter: after
            };
        });
        
        this.logger.warn('Found assistant tokens in LLM response', {
            conversationId,
            tokenCount: positions.length,
            tokenDetails: contextEntries
        });
    }
} 