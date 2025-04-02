import { DeleteCommandRequest } from './deleteCommandTypes';
import { createResponse } from '../../../utils/http/response';

export async function handleDeleteCommand(command: DeleteCommandRequest) {
  return createResponse(501, {
    success: false,
    error: 'Delete command not implemented yet',
    data: {
      command: command.raw,
      object: command.object
    }
  });
}
