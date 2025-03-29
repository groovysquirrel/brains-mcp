import { APIGatewayProxyResultV2 } from "aws-lambda";
import { CommandRequest } from '../../../commands/_core/registry/commandRegistry';
import { executeCommand } from '../../../commands';

// Simply pass through to the main command router
export async function handleCommand(command: CommandRequest): Promise<APIGatewayProxyResultV2> {
  return await executeCommand(command);
}