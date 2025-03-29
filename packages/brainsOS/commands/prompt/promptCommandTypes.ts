import { CommandRequest } from '../_core/registry/commandRegistry';
import { userContext } from '../../core/types/userTypes';
import { z } from 'zod';

// Valid base objects for prompt command
export const PromptBaseObjects = ['llm', 'model', 'default'] as const;
export type PromptBaseObject = typeof PromptBaseObjects[number];

// Model ID pattern (you may want to adjust this regex)
const modelIdPattern = /^[\w.-]+$/;

export interface PromptCommandRequest extends CommandRequest {
  action: 'prompt';
  object: PromptBaseObject | string;
  parameters: string[];
  flags: {
    message?: string;
    temperature?: string;
    maxTokens?: string;
    [key: string]: string | boolean | undefined;
  };
  user: userContext;
}

export const PromptCommandSchema = z.object({
  action: z.literal('prompt'),
  object: z.union([
    z.enum(PromptBaseObjects),
    z.string().regex(modelIdPattern, 'Invalid model ID format')
  ]),
  parameters: z.array(z.string()),
  flags: z.record(z.union([z.string(), z.boolean()])),
  raw: z.string(),
  user: z.object({
    userId: z.string(),
    userType: z.enum(['user', 'admin', 'system']),
    email: z.string().email().optional()
  })
});

export interface PromptCommandParams {
  modelId: string;
  message: string;
  temperature?: number;
  maxTokens?: number;
  messageHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
  }>;
}