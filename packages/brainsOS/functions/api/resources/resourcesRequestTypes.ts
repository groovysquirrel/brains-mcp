import { z } from 'zod';
import { BaseVersionedObject } from '../../../core/repositories/base/versionedRepository';

// Define metadata structure
const MetadataSchema = z.object({
  userEmail: z.string().optional(),
  userArn: z.string().optional(),
  createdAt: z.string().optional(),
  lastModifiedAt: z.string().optional(),
}).and(z.record(z.unknown())); // Allow additional unknown fields

// Common fields for all objects
const BaseObjectSchema = z.object({
  name: z.string(),
  content: z.record(z.unknown()), // Make this generic to store any content
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional().default('1.0.0'),
  createdBy: z.string().optional(),
  updatedBy: z.string().optional(),
  metadata: MetadataSchema.optional(),
});

// Define the operation types
const OperationType = z.enum(['create', 'update', 'delete', 'rename']);

// For all operations
export const ObjectRequestSchema = z.object({
  operation: z.enum(['create', 'update', 'delete', 'rename']),
  name: z.string(),
  version: z.string().optional(),
  createdBy: z.string().optional(),
  newName: z.string().optional(),
  content: z.any().optional(),
  description: z.string().optional(),
  tags: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
}).refine((data) => {
  // Validate required fields based on operation
  if (data.operation === 'rename' && !data.newName) {
    return false;
  }
  if (['create', 'update'].includes(data.operation) && (!data.version || !data.createdBy)) {
    return false;
  }
  return true;
}, {
  message: "Missing required fields for operation"
});

// For querying objects
export const ObjectQuerySchema = z.object({
  name: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional(),
}).partial();

export type StoredObject = z.infer<typeof BaseObjectSchema>;
export type ObjectRequest = z.infer<typeof ObjectRequestSchema>;
export type ObjectQuery = z.infer<typeof ObjectQuerySchema>;
