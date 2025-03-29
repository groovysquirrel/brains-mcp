import { APIGatewayProxyResultV2 } from 'aws-lambda';
import { handler } from '../promptHandler';
import { createMockEvent } from '../../../../../utils/test/mockEvent';
import { PromptServiceError } from '../promptHandlerErrors';

interface APIResponseWithBody {
  statusCode: number;
  body: string;
}

function isAPIResponseWithBody(response: APIGatewayProxyResultV2 | void): response is APIResponseWithBody {
  return response !== undefined && 
         response !== null && 
         typeof response === 'object' && 
         'statusCode' in response && 
         'body' in response;
}

describe('promptHandler', () => {
  // Helper to create a basic authorized event
  const createAuthorizedEvent = (overrides = {}) => createMockEvent({
    requestContext: {
      ...createMockEvent().requestContext,
      authorizer: {
        iam: {
          userId: 'test-user-id'
        }
      }
    },
    ...overrides
  });

  describe('Authorization', () => {
    it('should reject unauthorized requests', async () => {
      const event = createMockEvent({
        pathParameters: { promptType: 'instruction' }
      });
      // Remove authorization
      delete event.requestContext.authorizer;

      const response = await handler(event, {} as any, {} as any);
      expect(isAPIResponseWithBody(response)).toBe(true);
      if (isAPIResponseWithBody(response)) {
        expect(response.statusCode).toBe(401);
        expect(JSON.parse(response.body)).toMatchObject({
          success: false,
          error: {
            code: 'UNAUTHORIZED'
          }
        });
      }
    });
  });

  describe('Instruction Prompts', () => {
    it('should handle basic instruction prompt', async () => {
      const event = createAuthorizedEvent({
        pathParameters: { promptType: 'instruction' },
        requestContext: {
          ...createMockEvent().requestContext,
          http: { method: 'POST' }
        },
        body: JSON.stringify({
          userPrompt: 'What is 2+2?',
          modelId: 'anthropic.claude-v2',
          modelSource: 'bedrock'
        })
      });

      const response = await handler(event, {} as any, {} as any);
      expect(isAPIResponseWithBody(response)).toBe(true);
      if (isAPIResponseWithBody(response)) {
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toMatchObject({
          success: true
        });
      }
    });

    it('should reject requests with missing required fields', async () => {
      const event = createAuthorizedEvent({
        pathParameters: { promptType: 'instruction' },
        requestContext: {
          ...createMockEvent().requestContext,
          http: { method: 'POST' }
        },
        body: JSON.stringify({
          userPrompt: 'test'
          // missing modelId and modelSource
        })
      });

      const response = await handler(event, {} as any, {} as any);
      expect(isAPIResponseWithBody(response)).toBe(true);
      if (isAPIResponseWithBody(response)) {
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toMatchObject({
          success: false,
          error: {
            code: 'MISSING_PAYLOAD'
          }
        });
      }
    });
  });

  describe('Conversation Prompts', () => {
    it('should handle conversation prompt', async () => {
      const event = createAuthorizedEvent({
        pathParameters: { promptType: 'conversation' },
        requestContext: {
          ...createMockEvent().requestContext,
          http: { method: 'POST' }
        },
        body: JSON.stringify({
          userPrompt: 'Hello, how are you?',
          modelId: 'anthropic.claude-v2',
          modelSource: 'bedrock',
          conversationId: 'test-convo-1'
        })
      });

      const response = await handler(event, {} as any, {} as any);
      expect(isAPIResponseWithBody(response)).toBe(true);
      if (isAPIResponseWithBody(response)) {
        expect(response.statusCode).toBe(200);
        expect(JSON.parse(response.body)).toMatchObject({
          success: true
        });
      }
    });
  });

  describe('Invalid Requests', () => {
    it('should reject invalid prompt types', async () => {
      const event = createAuthorizedEvent({
        pathParameters: { promptType: 'invalid' },
        requestContext: {
          ...createMockEvent().requestContext,
          http: { method: 'POST' }
        },
        body: JSON.stringify({
          userPrompt: 'test',
          modelId: 'anthropic.claude-v2',
          modelSource: 'bedrock'
        })
      });

      const response = await handler(event, {} as any, {} as any);
      expect(isAPIResponseWithBody(response)).toBe(true);
      if (isAPIResponseWithBody(response)) {
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toMatchObject({
          success: false,
          error: {
            code: 'INVALID_PROMPT_TYPE'
          }
        });
      }
    });

    it('should handle missing request body', async () => {
      const event = createAuthorizedEvent({
        pathParameters: { promptType: 'instruction' },
        requestContext: {
          ...createMockEvent().requestContext,
          http: { method: 'POST' }
        }
        // no body
      });

      const response = await handler(event, {} as any, {} as any);
      expect(isAPIResponseWithBody(response)).toBe(true);
      if (isAPIResponseWithBody(response)) {
        expect(response.statusCode).toBe(400);
        expect(JSON.parse(response.body)).toMatchObject({
          success: false,
          error: {
            code: 'MISSING_PAYLOAD'
          }
        });
      }
    });
  });

  describe('Documentation', () => {
    it('should return API documentation for GET requests', async () => {
      const event = createAuthorizedEvent({
        pathParameters: { promptType: 'instruction' },
        requestContext: {
          ...createMockEvent().requestContext,
          http: { method: 'GET' }
        }
      });

      const response = await handler(event, {} as any, {} as any);
      expect(isAPIResponseWithBody(response)).toBe(true);
      if (isAPIResponseWithBody(response)) {
        expect(response.statusCode).toBe(200);
        const body = JSON.parse(response.body);
        expect(body.success).toBe(true);
        expect(body.data.documentation).toBeDefined();
        expect(body.data.supportedModels).toBeDefined();
      }
    });
  });
});
