import { APIGatewayProxyHandlerV2 } from "aws-lambda";
import { validateUser } from '../../auth/validateUser';
import { logRequest } from '../../shared/logging/requestLogger';
import { parseCommand } from '../../../system/commands/_core/parser/commandParser';
import { CommandRequest, CommandRequestSchema } from '../../../system/types/api/commands/commandTypes';
import { createResponse } from '../../../utils/http/response';
import { handleCommand } from './commandExecutor';
import { APIGatewayProxyHandlerV2WithIAMAuthorizer } from "aws-lambda";
import { createUserContext } from '../../auth/createUserContext';

export const handler: APIGatewayProxyHandlerV2WithIAMAuthorizer = async (event, context) => {
  const requestId = event.requestContext.requestId;

  try {
    console.log(`[${requestId}] Processing request:`, {
      method: event.requestContext.http.method,
      path: event.requestContext.http.path,
      headers: event.headers,
      body: event.body ? JSON.parse(event.body) : null,
      userId: event.requestContext.authorizer?.iam?.userId

    });

 
    const userId = event.requestContext.authorizer?.iam?.userId;
    if (!userId) {
      console.error(`[${requestId}] Missing userId in request context`);
      return createResponse(401, {
        success: false,
        error: 'Unauthorized - missing user context',
        requestId
      });
    }

 
    logRequest(requestId, 'command', userId);

    if (event.requestContext.http.method === "OPTIONS") {
      return createResponse(200, {
        success: true,
        data: null
      });
    }

    try {
      const body = JSON.parse(event.body || '{}');
      console.log(`[${requestId}] Parsed body:`, body);

      if (typeof body.command !== 'string') {
        console.error(`[${requestId}] Invalid command format:`, body);
        return createResponse(400, {
          success: false,
          error: 'Command must be a string',
          requestId
        });
      }

      const parsedCommand = parseCommand(body.command);
      console.log(`[${requestId}] Parsed command:`, parsedCommand);

      const userContext = createUserContext(userId);
      console.log(`[${requestId}] Created user context:`, {
        userId: userContext.userId,
        userType: userContext.userType
      });

      const commandWithContext: CommandRequest = {
        action: parsedCommand.action,
        object: parsedCommand.object,
        parameters: parsedCommand.parameters || [],
        flags: parsedCommand.flags || {},
        raw: parsedCommand.raw || body.command,
        user: userContext
      };

      const parseResult = CommandRequestSchema.safeParse(commandWithContext);
      if (!parseResult.success) {
        console.error(`[${requestId}] Validation failed:`, parseResult.error);
        return createResponse(400, {
          success: false,
          error: 'Invalid command format',
          details: parseResult.error.format(),
          requestId
        });
      }

      return await handleCommand(commandWithContext);

    } catch (error) {
      console.error(`[${requestId}] Command processing error:`, error);
      return createResponse(500, {
        success: false,
        error: error instanceof Error ? error.message : 'Command processing failed',
        requestId
      });
    }
  } catch (error) {
    console.error(`[${requestId}] Request failed:`, error);
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
      requestId
    });
  }
};