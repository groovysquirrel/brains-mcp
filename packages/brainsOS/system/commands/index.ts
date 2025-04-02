import { APIGatewayProxyResultV2 } from "aws-lambda";
import { CommandRequest, registry} from './_core/registry/commandRegistry';
import { createResponse } from '../../utils/http/response';

export async function executeCommand(command: CommandRequest): Promise<APIGatewayProxyResultV2> {
  try {
    return await registry.executeCommand(command);
  } catch (error) {
    console.error('Command execution failed:', error);
    return createResponse(400, {
      success: false,
      error: error instanceof Error ? error.message : 'Command execution failed'
    });
  }
}