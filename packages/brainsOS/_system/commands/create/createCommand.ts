import { CreateCommandRequest } from './createCommandTypes';
import { createResponse } from '../../../utils/http/response';

export async function handleCreateCommand(command: CreateCommandRequest) {
  return createResponse(501, {
    success: false,
    error: 'Create command not implemented yet',
    data: {
      command: command.raw,
      object: command.object
    }
  });
}
