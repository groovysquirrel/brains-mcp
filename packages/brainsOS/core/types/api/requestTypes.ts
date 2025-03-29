import { userContext } from '../userTypes';

export interface BaseApiRequest {
  action: string;
  object: string;
  parameters: string[];
  flags: Record<string, string | boolean>;
  raw: string;
  user: userContext;
}