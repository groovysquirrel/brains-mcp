import { z } from 'zod';

export type MessageRole = 'system' | 'user' | 'assistant';

export interface MessageContent {
  type: 'text';
  text: string;
}

export interface Message {
  role: MessageRole;
  content: string | MessageContent[];
  timestamp?: string;
}

export interface ConversationState {
  conversations: Record<string, Message[]>;
}

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.union([
    z.string(),
    z.array(z.object({
      type: z.literal('text'),
      text: z.string()
    }))
  ]),
  timestamp: z.string().optional()
});

export interface ConversationMetadata {
  createdAt: string;
  updatedAt: string;
  systemPrompt?: string;
  [key: string]: any;
}