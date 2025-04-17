/**
 * API Handler for Brain Controller
 * 
 * This handler provides HTTP API endpoints for interacting with the BrainController,
 * including MCP functionality for listing tools and executing commands.
 */

import { Logger } from '../../../utils/logging/logger';
import { BrainController } from '../../../modules/brain-controller/src/BrainController';
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

// Initialize logging
const logger = new Logger('BrainControllerAPIHandler');

// Global state for the Brain Controller
// This is a singleton pattern to ensure we only have one controller instance
let brainController: BrainController;

/**
 * Initializes the Brain Controller.
 * This is a critical setup step that:
 * 1. Creates a new BrainController instance
 * 2. Loads configuration from the config directory
 * 3. Sets up repositories and connections
 * 
 * @throws {Error} If initialization fails
 */
const initializeBrainController = async () => {
  try {
    logger.info('Initializing BrainController');

    brainController = BrainController.getInstance();
    await brainController.initialize();

    logger.info('BrainController initialized successfully');
  } catch (error) {
    const err = error as Error;
    logger.error('Failed to initialize BrainController:', {
      error: err
    });
    throw err;
  }
};

// Initialize controller immediately and ensure it's ready before handling requests
let initializationPromise: Promise<void>;

/**
 * Ensures the Brain Controller is initialized before handling any requests.
 * This uses a singleton pattern to prevent multiple initializations.
 * 
 * @returns Promise that resolves when controller is ready
 */
const ensureInitialized = async () => {
  if (!initializationPromise) {
    initializationPromise = initializeBrainController();
  }
  return initializationPromise;
};

// Initialize controller immediately
// This starts the initialization process as soon as the module is loaded
initializationPromise = initializeBrainController().catch(error => {
  logger.error('Failed to initialize BrainController:', error);
  throw error;
});

/**
 * Creates a standardized API response
 * @param statusCode HTTP status code
 * @param body Response body
 * @returns Formatted API Gateway response
 */
const createResponse = (statusCode: number, body: any): APIGatewayProxyResult => {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body)
  };
};

/**
 * Extracts and validates the user ID from the request
 * @param event API Gateway event
 * @returns User ID from the authorizer
 */
const extractUserId = (event: APIGatewayProxyEvent): string => {
  try {
    // Extract user ID from the authorizer context 
    if (event.requestContext.authorizer) {
      const userId = event.requestContext.authorizer.userId;
      
      if (userId && userId.trim() !== '') {
        logger.info('Extracted user ID from authorizer context', { userId });
        return userId;
      }
    }
    
    // Log if we couldn't extract a user ID
    logger.warn('Could not extract user ID from authorizer context');
    throw new Error('User authentication required');
  } catch (error) {
    logger.error('Error extracting user ID:', error);
    throw new Error('User authentication required');
  }
};

/**
 * Handles requests to list available MCP tools
 * @param event - The API Gateway event
 * @returns API Gateway response
 */
const handleListMCPTools = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID - will throw if not present
    const userId = extractUserId(event);
    logger.info('Handling request to list MCP tools', { userId });
    
    // Get available MCP tools from the brain controller
    const tools = brainController.getAvailableMCPTools();
    
    logger.info('Successfully retrieved MCP tools', { 
      userId,
      count: tools.length 
    });
    
    return createResponse(200, {
      tools,
      count: tools.length,
      type: 'tools',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error listing MCP tools:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handles requests to list available MCP transformers
 * @param event - The API Gateway event
 * @returns API Gateway response
 */
const handleListMCPTransformers = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID - will throw if not present
    const userId = extractUserId(event);
    logger.info('Handling request to list MCP transformers', { userId });
    
    // Get available MCP transformers from the brain controller
    const transformers = brainController.getAvailableMCPTransformers();
    
    logger.info('Successfully retrieved MCP transformers', { 
      userId,
      count: transformers.length 
    });
    
    return createResponse(200, {
      transformers,
      count: transformers.length,
      type: 'transformers',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error listing MCP transformers:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handles requests to list available MCP prompts
 * @param event - The API Gateway event
 * @returns API Gateway response
 */
const handleListMCPPrompts = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID - will throw if not present
    const userId = extractUserId(event);
    logger.info('Handling request to list MCP prompts', { userId });
    
    // Get available MCP prompts from the brain controller
    const prompts = brainController.getAvailableMCPPrompts();
    
    logger.info('Successfully retrieved MCP prompts', { 
      userId,
      count: prompts.length 
    });
    
    return createResponse(200, {
      prompts,
      count: prompts.length,
      type: 'prompts',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error listing MCP prompts:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handles requests to list available MCP resources
 * @param event - The API Gateway event
 * @returns API Gateway response
 */
const handleListMCPResources = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID - will throw if not present
    const userId = extractUserId(event);
    logger.info('Handling request to list MCP resources', { userId });
    
    // Get available MCP resources from the brain controller
    const resources = brainController.getAvailableMCPResources();
    
    logger.info('Successfully retrieved MCP resources', { 
      userId,
      count: resources.length 
    });
    
    return createResponse(200, {
      resources,
      count: resources.length,
      type: 'resources',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error listing MCP resources:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handles requests to list all available MCP components
 * @param event - The API Gateway event
 * @returns API Gateway response
 */
const handleListAllMCPComponents = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID - will throw if not present
    const userId = extractUserId(event);
    logger.info('Handling request to list all MCP components', { userId });
    
    // Get all available MCP components from the brain controller
    const tools = brainController.getAvailableMCPTools();
    const transformers = brainController.getAvailableMCPTransformers();
    const prompts = brainController.getAvailableMCPPrompts();
    const resources = brainController.getAvailableMCPResources();
    
    // Calculate total count
    const totalCount = tools.length + transformers.length + prompts.length + resources.length;
    
    logger.info('Successfully retrieved all MCP components', { 
      userId,
      toolCount: tools.length,
      transformerCount: transformers.length,
      promptCount: prompts.length,
      resourceCount: resources.length,
      totalCount
    });
    
    return createResponse(200, {
      tools,
      transformers,
      prompts,
      resources,
      counts: {
        tools: tools.length,
        transformers: transformers.length,
        prompts: prompts.length,
        resources: resources.length,
        total: totalCount
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error listing all MCP components:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handles requests to execute an MCP command
 * @param event API Gateway event
 * @returns API Gateway response
 */
const handleExecuteMCPCommand = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID - will throw if not present
    const userId = extractUserId(event);
    const body = JSON.parse(event.body || '{}');
    
    logger.info('Handling request to execute MCP command', { 
      userId,
      toolName: body.toolName
    });
    
    // Validate required fields
    if (!body.toolName) {
      return createResponse(400, {
        error: 'Missing required field: toolName',
        timestamp: new Date().toISOString()
      });
    }
    
    // Set default parameters if not provided
    const parameters = body.parameters || {};
    
    // Generate a connection ID for API requests
    const connectionId = `api_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Generate request ID if not provided
    const requestId = body.requestId || `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Send the MCP request through the brain controller
    await brainController.sendMCPRequest(
      {
        requestType: 'tool',
        requestId,
        toolName: body.toolName,
        parameters
      },
      connectionId,
      userId,
      body.conversationId,
      body.commandId
    );
    
    logger.info('Successfully queued MCP command', { 
      requestId,
      toolName: body.toolName
    });
    
    // Return success response with the request ID
    return createResponse(202, {
      requestId,
      status: 'queued',
      message: 'MCP command queued for processing',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error executing MCP command:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Handles requests to get MCP command status
 * Not implemented yet - would require a database to track command status
 */
const handleGetMCPCommandStatus = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Extract user ID - will throw if not present
    const userId = extractUserId(event);
    const requestId = event.queryStringParameters?.requestId;
    
    if (!requestId) {
      return createResponse(400, {
        error: 'Missing required parameter: requestId',
        timestamp: new Date().toISOString()
      });
    }
    
    logger.info('Checking MCP command status', { 
      userId, 
      requestId 
    });
    
    // In a full implementation, we would query a database to get the status
    // For now, return a mock response
    return createResponse(200, {
      requestId,
      userId,
      status: 'processing', // Could be: queued, processing, completed, failed
      message: 'MCP command status check not fully implemented yet',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    logger.error('Error getting MCP command status:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Unknown error',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Main Lambda handler for processing API Gateway requests
 * @param event API Gateway event
 * @returns API Gateway response
 */
export const handler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
  try {
    // Ensure controller is initialized
    await ensureInitialized();
    
    // Extract action from path parameter
    const action = event.pathParameters?.action || '';
    
    logger.info('Received request', {
      action,
      path: event.path,
      method: event.httpMethod
    });
    
    // Route request based on action
    switch (action) {
      case 'mcp-tools':
        return handleListMCPTools(event);
        
      case 'mcp-transformers':
        return handleListMCPTransformers(event);
        
      case 'mcp-prompts':
        return handleListMCPPrompts(event);
        
      case 'mcp-resources':
        return handleListMCPResources(event);
        
      case 'mcp-all':
        return handleListAllMCPComponents(event);
        
      case 'mcp-execute':
        return handleExecuteMCPCommand(event);
        
      case 'mcp-status':
        return handleGetMCPCommandStatus(event);
        
      default:
        return createResponse(400, {
          error: `Unsupported action: ${action}`,
          timestamp: new Date().toISOString()
        });
    }
  } catch (error) {
    logger.error('Error processing request:', error);
    
    // If this is an authentication error, return 401
    if (error instanceof Error && error.message === 'User authentication required') {
      return createResponse(401, {
        error: 'Authentication required',
        timestamp: new Date().toISOString()
      });
    }
    
    // Otherwise, return a 500 error
    return createResponse(500, {
      error: error instanceof Error ? error.message : 'Internal server error',
      timestamp: new Date().toISOString()
    });
  }
};
