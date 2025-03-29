import { BaseCommand } from '../../core/types/api/registry/commandRegistry';
import { SystemObjectType } from '../../core/types/baseTypes';

export interface UpdateCommandRequest extends BaseCommand {
  action: 'update';
  object: SystemObjectType;
  parameters: string[];
  flags: Record<string, string | boolean>;
}
