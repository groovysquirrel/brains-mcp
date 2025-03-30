import { APIGatewayProxyHandlerV2WithIAMAuthorizer, APIGatewayProxyResultV2 } from 'aws-lambda';
import { Logger } from '../../../../utils/logging/logger';
import { createResponse } from '../../../../utils/http/response';
import { LLMGateway } from '../../../../core/services/llm-gateway/llmGateway';
import { ChatRequest, ModelConfig } from '../../../../core/services/llm-gateway/types';
import { HumanMessage, AIMessage } from "@langchain/core/messages";

const logger = new Logger('LLMGatewayHandler');

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

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event): Promise<APIGatewayProxyResultV2> => {
  const startTime = Date.now();
  const requestId = event.requestContext.requestId;
  const userId = event.requestContext.authorizer?.iam?.userId;
  const promptType = event.pathParameters?.promptType;

  try {
    // Validate request body
    if (!event.body) {
      return createResponse(400, {
        success: false,
        error: { 
          code: 'MISSING_BODY',
          message: 'Missing request body' 
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Parse request
    const request = JSON.parse(event.body) as {
      messages: Array<{ role: 'user' | 'assistant', content: string }>;
      modelId: string;
      systemPrompt?: string;
      metadata?: Record<string, any>;
    };

    // Validate required fields
    if (!request.messages || !request.modelId) {
      return createResponse(400, {
        success: false,
        error: { 
          code: 'MISSING_FIELDS',
          message: 'Missing required fields' 
        },
        metadata: {
          requestId,
          timestamp: new Date().toISOString()
        }
      });
    }

    // Convert messages to LangChain format
    const messages = request.messages.map(msg => 
      msg.role === 'user' 
        ? new HumanMessage(msg.content)
        : new AIMessage(msg.content)
    );

    // Prepare model config
    const modelConfig: ModelConfig = {
      provider: 'bedrock',
      modelId: request.modelId as any,
      maxTokens: 4000,
      temperature: 0.7
    };

    // Prepare chat request
    const chatRequest: ChatRequest = {
      messages,
      modelConfig,
      systemPrompt: request.systemPrompt,
      metadata: {
        ...request.metadata,
        userId,
        requestId,
        promptType
      }
    };

    // Check if streaming is requested
    const isStreaming = event.queryStringParameters?.stream === 'true';

    if (isStreaming) {
      // Handle streaming response
      const stream = llmGateway.streamChat(chatRequest);
      
      // Convert stream to SSE format
      let streamBuffer = '';
      for await (const chunk of stream) {
        streamBuffer += `data: ${JSON.stringify(chunk)}\n\n`;
      }

      return {
        statusCode: 200,
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
        body: streamBuffer
      };
    } else {
      // Handle regular response
      const response = await llmGateway.chat(chatRequest);

      return createResponse(200, {
        success: true,
        data: response,
        metadata: {
          requestId,
          processingTimeMs: Date.now() - startTime,
          timestamp: new Date().toISOString()
        }
      });
    }

  } catch (error) {
    logger.error('Error in LLM Gateway handler:', {
      error,
      requestId,
      userId,
      promptType
    });

    return createResponse(500, {
      success: false,
      error: { 
        code: 'INTERNAL_ERROR',
        message: error.message || 'Internal server error' 
      },
      metadata: {
        requestId,
        timestamp: new Date().toISOString()
      }
    });
  }
}; 