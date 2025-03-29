import { z } from 'zod';
import { CommandObject } from './commandDefinition';
import { CommandRequest } from '../../../../commands/_core/registry/commandRegistry';

// Command Request Schema
export const CommandRequestSchema = z.object({
  action: z.enum(['test', 'set', 'show', 'list', 'load', 'prompt', 'add', 'create', 'delete', 'update']),
  object: z.string(),
  parameters: z.array(z.string()),
  flags: z.record(z.union([z.string(), z.boolean()])),
  raw: z.string(),
  user: z.object({
    userId: z.string(),
    userType: z.literal('user'),
    email: z.string().email().optional()
  })
});

// Response Types
export const CommandResponseSchema = z.object({
  success: z.boolean(),
  data: z.unknown().optional(),
  error: z.string().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type CommandResponse = z.infer<typeof CommandResponseSchema>;

// Re-export core types
export type { CommandObject, CommandRequest };

