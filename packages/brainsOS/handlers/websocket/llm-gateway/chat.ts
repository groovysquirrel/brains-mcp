import { Logger } from '../../shared/logging/logger';
import { LLMGateway } from '../../../system/services/llm-gateway/llmGateway';
import { ChatRequest, ModelConfig } from '../../../system/services/llm-gateway/types';
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import * as AWS from 'aws-sdk';
import { WebSocketEvent } from '../types/websocketTypes';
import { Resource } from 'sst';

const logger = new Logger('LLMGatewayChat');

/**
 * TODO: Support both streaming and message APIs:
 * - Currently using Messages API for Claude 3
 * - Need to add support for streaming API for other models
 * - Consider adding a configuration option to choose between APIs
 * - Update model configurations to specify which API to use
 * - Add streaming support in the WebSocket handler for models that support it
 */

// Initialize the LLM Gateway with provider configs
// Using IAM credentials from Lambda execution role
const llmGateway = new LLMGateway({
  bedrock: {}
});

export const handler = async (event: WebSocketEvent) => {
  const connectionId = event.requestContext.connectionId;
  const userId = event.requestContext.authorizer?.userId;
  const routeKey = event.requestContext.routeKey;

  logger.info('Processing chat request', {
    connectionId,
    userId,
    routeKey,
    body: event.body
  });

  try {
    // Parse the message body
    const body = JSON.parse(event.body || '{}');
    const { data } = body;
    const { messages, modelId, systemPrompt, metadata } = data || {};

    // Validate required fields
    if (!messages) {
      logger.error('Missing required field: messages', { body });
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required field: messages'
          },
          metadata: {
            connectionId,
            userId,
            timestamp: new Date().toISOString()
          }
        })
      };
    }

    // Convert messages to LangChain format
    const langChainMessages = messages.map((msg: any) => 
      msg.role === 'user' 
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    logger.info('Converted messages to LangChain format', {
      messageCount: langChainMessages.length
    });

    // Prepare model config with default model if not specified
    const modelConfig: ModelConfig = {
      provider: 'bedrock',
      modelId: modelId || 'anthropic.claude-3-sonnet-20240229-v1:0',
      maxTokens: 4000,
      temperature: 0.7
    };

    logger.info('Using model config', { modelConfig });

    // Prepare chat request with user ID
    const chatRequest: ChatRequest = {
      messages: langChainMessages,
      modelConfig,
      systemPrompt,
      metadata: {
        ...metadata,
        userId,
        connectionId,
        routeKey,
        timestamp: new Date().toISOString()
      }
    };

    logger.info('Starting chat request', { chatRequest });

    // Get the response
    const response = await llmGateway.chat(chatRequest);
    
    logger.info('Received response from LLM', { response });

    // Send the response to the client
    await sendToClient(connectionId, {
      success: true,
      data: response,
      metadata: {
        connectionId,
        userId,
        timestamp: new Date().toISOString()
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        metadata: {
          connectionId,
          userId,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    logger.error('Error in WebSocket chat handler:', {
      error,
      connectionId,
      userId,
      routeKey,
      stack: error.stack
    });

    // Send error to client
    await sendToClient(connectionId, {
      success: false,
      error: {
        code: 'CHAT_ERROR',
        message: error.message || 'Failed to process chat request'
      },
      metadata: {
        connectionId,
        userId,
        timestamp: new Date().toISOString()
      }
    });

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: {
          code: 'CHAT_ERROR',
          message: error.message || 'Failed to process chat request'
        },
        metadata: {
          connectionId,
          userId,
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};

// Helper function to send messages to the WebSocket client
async function sendToClient(connectionId: string, data: any) {
  const endpoint = Resource.brains_websocket_api_latest.url;
  if (!endpoint) {
    throw new Error('WEBSOCKET_API_ENDPOINT environment variable is not set');
  }

  // Construct the WebSocket API endpoint URL
  const apiEndpoint = endpoint.replace('wss://', 'https://');
  
  logger.info('Initializing ApiGatewayManagementApi', { apiEndpoint });

  const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
    endpoint: apiEndpoint
  });

  try {
    logger.info('Sending message to client', { connectionId, data });
    await apiGatewayManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }).promise();
    logger.info('Message sent successfully', { connectionId });
  } catch (error) {
    if (error.statusCode === 410) {
      // Connection is stale, remove it
      logger.warn('Stale connection removed', { connectionId });
    } else {
      logger.error('Error sending message to client', {
        error,
        connectionId,
        endpoint: apiEndpoint
      });
      throw error;
    }
  }
} 