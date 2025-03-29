import { CommandRequest } from '../_core/registry/commandRegistry';
import { userContext } from '../../core/types/userTypes';

export interface LoadCommandRequest extends CommandRequest {
  action: 'load';
  object: 'llm' | 'llms';
  parameters: string[];
  flags: Record<string, string | boolean>;
  user: userContext;
}

export interface LoadCommandParams {
  source?: string;
  provider?: string;
  model?: string;
  support?: string;
  reset?: boolean;
}
