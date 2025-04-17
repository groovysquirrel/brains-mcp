import { z } from 'zod';

// Core system object types
export const SystemObjectTypes = ['llm', 'template', 'prompt', 'cnode', 'definition'] as const;
export type SystemObjectType = typeof SystemObjectTypes[number];

// Base system object schema that all other objects extend
export const BaseSystemObjectSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(SystemObjectTypes),
  name: z.string().min(1),
  description: z.string().optional(),
  friendlyName: z.string().optional(),
  created: z.string().datetime(),
  modified: z.string().datetime(),
  userid: z.string().default('system'),
  content: z.unknown().optional(),
  metadata: z.record(z.string(), z.unknown()).optional()
});

export type BaseSystemObject = z.infer<typeof BaseSystemObjectSchema>;

// Database record type
export interface SystemRecord {
  userid: string;
  typename: string;  // format: "{type}#{id}"
  content: BaseSystemObject;
}