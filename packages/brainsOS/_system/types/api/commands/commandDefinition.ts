import { z } from 'zod';

// 1. Base Command Types
export interface BaseCommandConfig {
  requiresAuth: boolean;
  allowsFlags: boolean;
  schema?: z.ZodSchema;
  help: string;
}

// 2. Object Registry
export const CommandObjects = [
  'system',
  'connection',
  'model',
  'format',
  'llms',
  'templates',
  'models',
  'llm',
  'template',
  'prompt',
  'cnode',
  'definition',
  'default'
] as const;

export type CommandObject = typeof CommandObjects[number];