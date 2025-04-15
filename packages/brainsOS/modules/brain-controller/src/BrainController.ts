import { BrainConfig } from './types/BrainConfig';
import { BrainRequest } from './types/BrainRequest';
import { BrainResponse, createErrorResponse, createTerminalResponse, createProcessingResponse } from './types/BrainResponse';
import { BrainsRepository } from './repositories/brains/BrainsRepository';
import { Logger } from './utils/logging/Logger';
import { Gateway } from '../../llm-gateway/src/Gateway';
import * as fs from 'fs';
import * as path from 'path';

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
        
        // Load MCP prompt
        try {
            this.mcpPrompt = fs.readFileSync(
                
                path.join(process.cwd(), 'brain-controller/config/mcpPrompt.md'),
                'utf-8'
            );
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
            this.logger.info('BrainController initialized successfully');
        } catch (error) {
            this.logger.error('Failed to initialize BrainController:', error);
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
                default:
                    return createErrorResponse(`Unsupported action: ${action}`);
            }
        } catch (error) {
            this.logger.error('Error processing request:', error);
            return createErrorResponse(error instanceof Error ? error.message : 'An unexpected error occurred');
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

        // Format the system prompt with brain configuration and MCP prompt
        const formattedSystemPrompt = `Your name and nickname is ${brain.config.nickname}.

PERSONA: ${brain.config.persona}

${brain.config.systemPrompt}

${this.mcpPrompt}`;

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
            content: gatewayResponse.content 
        });

        // Convert gateway response to brain response
        return createTerminalResponse(
            gatewayResponse.content,
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
} 