import { z } from 'zod';
import { BaseVersionedObject } from '../repositories/base/versionedRepository';

// Define the content schema separately for clarity
const PromptContentSchema = z.object({
  prompt: z.string().optional(),
  template: z.string().optional(),
  defaultModel: z.string().optional(),
  parameters: z.record(z.any()).optional()
});

// Schema for validation
export const PromptSchema = z.object({
  // Required fields (from BaseVersionedObject)
  name: z.string(),
  version: z.string(),
  createdBy: z.string(),
  type: z.literal('prompt'),
  content: PromptContentSchema,
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

// Explicit interface extending BaseVersionedObject
export interface Prompt extends BaseVersionedObject {
  type: 'prompt';
  content: {
    prompt?: string;
    template?: string;
    defaultModel?: string;
    parameters?: Record<string, any>;
  };
  tags?: string[];
}

// Type guard to check if an object is a valid Prompt
export function isPrompt(obj: unknown): obj is Prompt {
  return PromptSchema.safeParse(obj).success;
}
