import { UpdateCommandRequest } from './updateCommandTypes';
import { createResponse } from '../../utils/response';

export async function handleUpdateCommand(command: UpdateCommandRequest) {
  return createResponse(501, {
    success: false,
    error: 'Update command not implemented yet',
    data: {
      command: command.raw,
      object: command.object
    }
  });
}
