import { CommandRequest } from '../_core/registry/commandRegistry';
import { SystemObjectType } from '../../core/types/baseTypes';

export interface DeleteCommandRequest extends CommandRequest {
  action: 'delete';
  object: SystemObjectType;
  parameters: string[];
  flags: Record<string, string | boolean>;
}
