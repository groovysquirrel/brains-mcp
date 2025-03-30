import { MCPConfig, MCPState, MCPActivity, MCPResource, MCPSession } from './types/index';
import { formatMCPPrompt } from './prompts/mcp-system-prompt';
import { get, post } from '@aws-amplify/api';

/**
 * MCPController: The main class that manages all interactions between the frontend and the MCP system.
 * 
 * This controller follows a simple request/response pattern but is designed to be extended
 * with WebSocket support in the future. The current implementation uses REST API calls,
 * but the structure allows for easy addition of real-time updates via WebSockets.
 * 
 * Key Concepts:
 * 1. Session Management: Each user interaction is part of a session
 * 2. Activity Tracking: All actions (user messages, tool calls, etc.) are tracked as activities
 * 3. Resource Management: Resources (files, data) can be loaded and managed
 * 4. State Management: The controller maintains a state that can be observed by UI components
 * 
 * Future WebSocket Implementation:
 * - The controller will maintain both REST and WebSocket connections
 * - WebSocket will be used for real-time updates (resource changes, tool progress)
 * - REST will be used for command execution and initial data loading
 * - State updates will come from both sources
 */
export class MCPController {
  // Core state and configuration
  private state: MCPState;
  private config: MCPConfig;
  private currentSession: MCPSession | null = null;
  private systemPrompt: string;
  private conversationId: string | null = null;

  // Future WebSocket implementation
  /*
  private webSocketService: WebSocketService;
  private isWebSocketEnabled: boolean = false;
  */

  constructor(config: MCPConfig) {
    this.config = config;
    this.state = {
      isConnected: true, // Will be managed by WebSocket in future implementation
      error: null,
      activeResources: [],
      activities: []
    };
    this.systemPrompt = formatMCPPrompt(config.systemPromptContext);

    // Future WebSocket initialization
    /*
    if (config.enableWebSocket) {
      this.webSocketService = new WebSocketService(config.server.wsUrl);
      this.isWebSocketEnabled = true;
    }
    */
  }

  /**
   * Initialize the controller and set up necessary connections
   * 
   * Current Implementation:
   * - Creates a new session for tracking user interactions
   * 
   * Future WebSocket Implementation:
   * - Will establish WebSocket connection
   * - Set up event listeners for real-time updates
   * - Handle connection state changes
   */
  async initialize(): Promise<void> {
    try {
      await this.createSession();

      // Future WebSocket setup
      /*
      if (this.isWebSocketEnabled) {
        await this.webSocketService.connect();
        
        // Set up WebSocket event handlers
        this.webSocketService.onConnectionChange((connected) => {
          this.setState({ isConnected: connected });
        });

        this.webSocketService.onMessage((message) => {
          this.handleWebSocketMessage(message);
        });
      }
      */
    } catch (error) {
      this.setState({ error: 'Failed to initialize MCP controller' });
      throw error;
    }
  }

  /**
   * Process a user message through the MCP system
   * 
   * Flow:
   * 1. Create activity to track the message
   * 2. Send to LLM with MCP context
   * 3. Parse LLM response for MCP commands
   * 4. Execute commands
   * 5. Process results
   * 
   * Future WebSocket Implementation:
   * - Will receive real-time updates about command execution
   * - Can show progress of long-running operations
   * - Will handle streaming responses from LLM
   */
  async processUserMessage(message: string): Promise<void> {
    try {
      // Track the user message as an activity
      const activity: MCPActivity = this.createActivity('user_message', { message });
      this.addActivity(activity);

      // Get LLM response with MCP commands
      const llmResponse = await this.sendToLLM(message);
      const mcpCommands = this.parseMCPCommands(llmResponse);
      
      // Execute commands and process results
      const results = await this.executeMCPCommands(mcpCommands);
      await this.processResults(results);

      // Mark activity as completed
      activity.status = 'completed';
    } catch (error) {
      this.setState({ error: 'Failed to process user message' });
      throw error;
    }
  }

  /**
   * Send a message to the LLM and get its response
   * 
   * The LLM response should include:
   * 1. Natural language response to the user
   * 2. MCP commands in <mcp> tags (if any)
   * 
   * Future WebSocket Implementation:
   * - Will support streaming responses
   * - Can show typing indicators
   * - Will handle partial responses
   */
  private async sendToLLM(message: string): Promise<string> {
    try {
      // Prepare the payload for the LLM
      const payload = this.createLLMPayload(message);
      
      // Send request to prompt service
      const response = await this.sendPromptRequest(payload);
      const responseContent = this.extractLLMResponse(response);

      // Track the assistant's response
      const assistantActivity = this.createActivity('assistant_response', { 
        message: responseContent 
      });
      this.addActivity(assistantActivity);

      return responseContent;
    } catch (error) {
      console.error('Error in sendToLLM:', error);
      throw error;
    }
  }

  /**
   * Create the payload for the LLM request
   */
  private createLLMPayload(message: string): any {
    return {
      userPrompt: message,
      modelId: this.config.llm.model,
      modelSource: 'bedrock',
      systemPrompt: this.systemPrompt,
      ...(this.conversationId && { 
        conversationId: this.conversationId,
        messageHistory: this.getConversationHistory()
      })
    };
  }

  /**
   * Get the conversation history from activities
   */
  private getConversationHistory(): Array<{ role: string; content: string }> {
    return this.state.activities
      .filter(a => a.type === 'user_message' || a.type === 'assistant_response')
      .map(a => ({
        role: a.type === 'user_message' ? 'user' : 'assistant',
        content: a.details?.message || ''
      }));
  }

  /**
   * Send the prompt request to the API
   */
  private async sendPromptRequest(payload: any): Promise<any> {
    const restOperation = post({
      apiName: "brainsOS",
      path: `/latest/services/prompt/${this.conversationId ? 'conversation' : 'instruction'}`,
      options: { 
        body: payload,
        headers: { 'Content-Type': 'application/json' }
      }
    });

    const response = await restOperation.response;
    return await response.body.json();
  }

  /**
   * Extract the LLM response from the API response
   */
  private extractLLMResponse(responseData: any): string {
    if (!responseData.success || responseData.error) {
      throw new Error(responseData.error?.message || 'Failed to get LLM response');
    }

    return responseData.data?.response || responseData.data?.content || '';
  }

  /**
   * Parse the LLM response to extract MCP commands
   * 
   * Expected format:
   * <mcp>
   *   {
   *     "commands": [
   *       { "type": "tool_call", "tool": "toolId", "params": {} },
   *       { "type": "resource_access", "resource": "resourceId" }
   *     ]
   *   }
   * </mcp>
   */
  private parseMCPCommands(llmResponse: string): any[] {
    const mcpMatch = llmResponse.match(/<mcp>([\s\S]*?)<\/mcp>/);
    if (!mcpMatch) {
      return [];
    }

    try {
      const mcpData = JSON.parse(mcpMatch[1]);
      return mcpData.commands || [];
    } catch (error) {
      console.error('Failed to parse MCP commands:', error);
      return [];
    }
  }

  /**
   * Execute a list of MCP commands and collect results
   * 
   * Command Types:
   * - tool_call: Execute a tool with parameters
   * - resource_access: Load or access a resource
   * 
   * Future WebSocket Implementation:
   * - Will receive real-time updates about command execution
   * - Can show progress of long-running operations
   * - Will handle streaming results
   */
  private async executeMCPCommands(commands: any[]): Promise<any[]> {
    const results = [];
    for (const command of commands) {
      try {
        if (command.type === 'tool_call') {
          const result = await this.executeTool(command.tool, command.params);
          results.push(result);
        } else if (command.type === 'resource_access') {
          const result = await this.loadResource(command.resource);
          results.push(result);
        }
      } catch (error: unknown) {
        console.error(`Failed to execute command: ${command.type}`, error);
        results.push({ 
          error: error instanceof Error ? error.message : 'Unknown error occurred' 
        });
      }
    }
    return results;
  }

  /**
   * Execute a tool via the MCP server
   * 
   * Future WebSocket Implementation:
   * - Will receive real-time updates about tool execution
   * - Can show progress of long-running tools
   * - Will handle streaming tool output
   */
  async executeTool(toolId: string, params: any): Promise<MCPActivity> {
    const activity = this.createActivity('tool_execution', { toolId, params });
    this.addActivity(activity);

    try {
      const response = await this.sendToolRequest(toolId, params);
      const updatedActivity = this.updateActivityWithResult(activity, response);
      this.addActivity(updatedActivity);
      return updatedActivity;
    } catch (error) {
      const failedActivity = this.updateActivityWithError(activity, error);
      this.addActivity(failedActivity);
      throw error;
    }
  }

  /**
   * Send a tool execution request to the API
   */
  private async sendToolRequest(toolId: string, params: any): Promise<any> {
    const restOperation = post({
      apiName: "brainsOS",
      path: `/latest/mcp/tools/${toolId}`,
      options: { 
        body: params,
        headers: { 'Content-Type': 'application/json' }
      }
    });

    const response = await restOperation.response;
    return await response.body.json();
  }

  /**
   * Load a resource from the MCP server
   * 
   * Future WebSocket Implementation:
   * - Will receive real-time updates about resource changes
   * - Can show resource loading progress
   * - Will handle streaming resource content
   */
  async loadResource(resourceId: string): Promise<MCPResource> {
    const resource = this.createResource(resourceId);
    this.addResource(resource);

    try {
      const response = await this.sendResourceRequest(resourceId);
      const updatedResource = this.updateResourceWithResponse(resource, response);
      this.addResource(updatedResource);
      return updatedResource;
    } catch (error) {
      console.error(`Failed to load resource: ${resourceId}`, error);
      throw error;
    }
  }

  /**
   * Send a resource request to the API
   */
  private async sendResourceRequest(resourceId: string): Promise<any> {
    const restOperation = get({
      apiName: "brainsOS",
      path: `/latest/mcp/resources/${resourceId}`
    });

    const response = await restOperation.response;
    return await response.body.json();
  }

  /**
   * Create a new session for tracking user interactions
   */
  async createSession(): Promise<MCPSession> {
    const session: MCPSession = {
      id: crypto.randomUUID(),
      startTime: Date.now(),
      status: 'active'
    };

    this.currentSession = session;
    this.conversationId = session.id;
    
    return session;
  }

  /**
   * Create a new activity for tracking
   */
  private createActivity(type: string, details: any): MCPActivity {
    return {
      id: crypto.randomUUID(),
      sessionId: this.currentSession?.id || 'unknown',
      type,
      status: 'pending',
      timestamp: Date.now(),
      details
    };
  }

  /**
   * Add an activity to the state
   */
  private addActivity(activity: MCPActivity): void {
    this.setState({
      activities: [...this.state.activities, activity]
    });
  }

  /**
   * Create a new resource
   */
  private createResource(id: string): MCPResource {
    return {
      id,
      type: 'unknown',
      name: 'Unknown Resource',
      content: null
    };
  }

  /**
   * Add a resource to the state
   */
  private addResource(resource: MCPResource): void {
    this.setState({
      activeResources: [...this.state.activeResources, resource]
    });
  }

  /**
   * Update an activity with its result
   */
  private updateActivityWithResult(activity: MCPActivity, response: any): MCPActivity {
    return {
      ...activity,
      status: 'completed',
      details: {
        ...activity.details,
        result: response.content?.[0]?.data
      }
    };
  }

  /**
   * Update an activity with an error
   */
  private updateActivityWithError(activity: MCPActivity, error: unknown): MCPActivity {
    return {
      ...activity,
      status: 'failed',
      details: {
        ...activity.details,
        error: error instanceof Error ? error.message : 'Unknown error'
      }
    };
  }

  /**
   * Update a resource with its response data
   */
  private updateResourceWithResponse(resource: MCPResource, response: any): MCPResource {
    return {
      ...resource,
      content: response.content?.[0]?.data,
      type: response.content?.[0]?.data?.type || 'unknown',
      name: response.content?.[0]?.data?.name || resource.id
    };
  }

  /**
   * Get the current state of the controller
   */
  getState(): MCPState {
    return { ...this.state };
  }

  /**
   * Update the controller's state
   */
  private setState(newState: Partial<MCPState>): void {
    this.state = { ...this.state, ...newState };
  }

  /**
   * Update the controller's configuration
   */
  updateConfig(newConfig: Partial<MCPConfig>): void {
    this.config = { ...this.config, ...newConfig };
    if (newConfig.systemPromptContext) {
      this.systemPrompt = formatMCPPrompt(newConfig.systemPromptContext);
    }
  }

  /**
   * Process MCP command results and update UI
   * 
   * This method takes the results from executing MCP commands and creates
   * activities to track their outcomes. Each result is stored as an activity
   * with its status (completed/failed) and any error information.
   */
  private async processResults(results: any[]): Promise<void> {
    // Update state with results
    this.setState({
      activities: [
        ...this.state.activities,
        ...results.map(result => ({
          id: crypto.randomUUID(),
          sessionId: this.currentSession?.id || 'unknown',
          type: 'command_result',
          status: result.error ? 'failed' : 'completed',
          timestamp: Date.now(),
          details: result
        }))
      ]
    });
  }

  /**
   * Get available MCP services (tools, resources, prompts)
   */
  async getAvailableServices(type?: 'tools' | 'resources' | 'prompts'): Promise<any> {
    try {
      const restOperation = get({
        apiName: "brainsOS",
        path: `/latest/mcp/index${type ? `/${type}` : ''}`
      });

      const response = await restOperation.response;
      const rawData = await response.body.json() as {
        success: boolean;
        error?: {
          message: string;
          code: string;
          details?: Record<string, any>;
        };
        content?: Array<{
          text: string;
          data?: any;
        }>;
      };
      
      if (!rawData?.success || rawData?.error) {
        throw new Error(rawData?.error?.message || 'Failed to get available services');
      }

      return rawData?.content?.[0]?.data;
    } catch (error) {
      console.error('Failed to get available services:', error);
      throw error;
    }
  }

  /**
   * Clean up resources when the controller is no longer needed
   * 
   * Future WebSocket Implementation:
   * - Will close WebSocket connection
   * - Clean up event listeners
   * - Cancel any pending operations
   */
  dispose(): void {
    // Future WebSocket cleanup
    /*
    if (this.isWebSocketEnabled) {
      this.webSocketService.disconnect();
    }
    */
  }
} 