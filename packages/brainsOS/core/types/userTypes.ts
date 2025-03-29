import { z } from 'zod';
import { BaseSystemObjectSchema } from './baseTypes';

// Base User Context Schema
export const UserContextSchema = z.object({
  userId: z.string(),
  userType: z.enum(['system', 'user', 'admin']).default('user'),
  email: z.string().email().optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

// Full User Schema for Database
export const UserSchema = BaseSystemObjectSchema.extend({
  type: z.literal('user'),
  userType: z.enum(['system', 'user', 'admin']),
  email: z.string().optional(),
  permissions: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

export function getUserId(user: userContext): string {
  return user.userId;
}

// Type Exports
export type userContext = z.infer<typeof UserContextSchema>;
export type user = z.infer<typeof UserSchema>;

// Helper function to convert User to UserContext
export function toUserContext(user: user): userContext {
  return {
    userId: user.id,
    userType: user.userType,
    email: user.email,
    permissions: user.permissions,
    metadata: user.metadata
  };
}