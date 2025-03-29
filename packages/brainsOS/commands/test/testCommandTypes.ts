import { CommandRequest} from '../_core/registry/commandRegistry';
import { userContext } from '../../core/types/userTypes';

export interface TestCommandRequest extends CommandRequest {
    action: 'test';
    object: 'connection';
    parameters: string[];  // Changed to allow service parameter
    flags: Record<string, string | boolean>;
    user: userContext;
  }