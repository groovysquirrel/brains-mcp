import { z } from 'zod';

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface conversationState {
  conversations: Record<string, Message[]>;
}

export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string()
});

export type MessageRole = 'user' | 'assistant';

export interface Message {
  role: MessageRole;
  content: string;
  timestamp: string;
}