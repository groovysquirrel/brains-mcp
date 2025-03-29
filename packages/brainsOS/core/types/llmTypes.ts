import { z } from 'zod';
import { BaseSystemObjectSchema } from './baseTypes';

export const LLMSchema = BaseSystemObjectSchema.extend({
  type: z.literal('llm'),
  modelId: z.string(),
  name: z.string(),
  vendor: z.string(),
  status: z.string().optional(),
  maxTokens: z.number().optional(),
  source: z.string().optional(),
  isDefault: z.boolean().optional()
});

export type LLM = z.infer<typeof LLMSchema>;