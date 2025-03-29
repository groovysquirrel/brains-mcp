import { z } from 'zod';
import { BaseSystemObjectSchema } from './baseTypes';

export const TemplateSchema = BaseSystemObjectSchema.extend({
  type: z.literal('template'),
  category: z.enum(['system', 'user', 'custom']),
  content: z.string(),
  variables: z.array(z.string()).optional(),
  requiredLLM: z.string().optional()
});

export type Template = z.infer<typeof TemplateSchema>;