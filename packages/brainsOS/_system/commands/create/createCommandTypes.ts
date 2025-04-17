import { CommandRequest } from '../_core/registry/commandRegistry';
import { SystemObjectType } from '../../types/baseTypes';

export interface CreateCommandRequest extends CommandRequest {
  action: 'create';
  object: SystemObjectType;
  parameters: string[];
  flags: Record<string, string | boolean>;
}
