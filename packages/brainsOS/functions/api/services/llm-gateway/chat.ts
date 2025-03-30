import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from 'aws-lambda';
import { Logger } from '../../../../utils/logging/logger';
import { LLMGateway } from '../../../../core/services/llm-gateway/llmGateway';
import { ChatRequest, ModelConfig } from '../../../../core/services/llm-gateway/types';
import { HumanMessage, AIMessage } from "@langchain/core/messages";
import * as AWS from 'aws-sdk';

const logger = new Logger('LLMGatewayChat');

// Initialize the LLM Gateway with provider configs
const llmGateway = new LLMGateway({
  bedrock: {
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  }
});

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event) => {
  const connectionId = (event.requestContext as any).connectionId;
  const userId = event.requestContext.authorizer?.iam?.userId;
  const routeKey = (event.requestContext as any).routeKey;

  try {
    // Parse the message body
    const body = JSON.parse(event.body || '{}');
    const { messages, modelId, systemPrompt, metadata } = body;

    // Validate required fields
    if (!messages || !modelId) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          success: false,
          error: {
            code: 'INVALID_REQUEST',
            message: 'Missing required fields'
          },
          metadata: {
            connectionId,
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

    // Prepare model config
    const modelConfig: ModelConfig = {
      provider: 'bedrock',
      modelId: modelId as any,
      maxTokens: 4000,
      temperature: 0.7
    };

    // Prepare chat request
    const chatRequest: ChatRequest = {
      messages: langChainMessages,
      modelConfig,
      systemPrompt,
      metadata: {
        ...metadata,
        userId,
        connectionId,
        routeKey
      }
    };

    // Stream the response
    const stream = llmGateway.streamChat(chatRequest);
    
    // Process the stream and send chunks back to the client
    for await (const chunk of stream) {
      await sendToClient(connectionId, {
        success: true,
        data: chunk,
        metadata: {
          connectionId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Send completion message
    await sendToClient(connectionId, {
      success: true,
      data: { type: 'complete' },
      metadata: {
        connectionId,
        timestamp: new Date().toISOString()
      }
    });

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        metadata: {
          connectionId,
          timestamp: new Date().toISOString()
        }
      })
    };

  } catch (error) {
    logger.error('Error in WebSocket chat handler:', {
      error,
      connectionId,
      userId,
      routeKey
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
          timestamp: new Date().toISOString()
        }
      })
    };
  }
};

// Helper function to send messages to the WebSocket client
async function sendToClient(connectionId: string, data: any) {
  const apiGatewayManagementApi = new AWS.ApiGatewayManagementApi({
    endpoint: process.env.WEBSOCKET_API_ENDPOINT
  });

  try {
    await apiGatewayManagementApi.postToConnection({
      ConnectionId: connectionId,
      Data: JSON.stringify(data)
    }).promise();
  } catch (error) {
    if (error.statusCode === 410) {
      // Connection is stale, remove it
      logger.warn('Stale connection removed', { connectionId });
    } else {
      throw error;
    }
  }
} 