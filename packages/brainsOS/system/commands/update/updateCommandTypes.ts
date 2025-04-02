import { BaseCommand } from '../../system/types/api/registry/commandRegistry';
import { SystemObjectType } from '../../types/baseTypes';

export interface UpdateCommandRequest extends BaseCommand {
  action: 'update';
  object: SystemObjectType;
  parameters: string[];
  flags: Record<string, string | boolean>;
}
