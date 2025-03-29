import { CommandRequest } from '../_core/registry/commandRegistry';
import { userContext } from '../../core/types/userTypes';

export interface ListCommandRequest extends CommandRequest {
  action: 'list';
  object: 'llm';
  parameters: string[];
  flags: Record<string, string | boolean>;
  user: userContext;
}
