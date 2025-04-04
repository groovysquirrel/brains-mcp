import { z } from 'zod';
import { ModelId } from '../types';

// Message validation schema
export const MessageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string(),
  timestamp: z.string().optional()
});

// Create a Zod enum from ModelId type
export const ModelIdSchema = z.enum([
  // Bedrock models
  'anthropic.claude-3-sonnet-20240229-v1:0',
  'anthropic.claude-3-haiku-20240307-v1:0',
  'anthropic.claude-2.1',
  'anthropic.claude-2',
  'anthropic.claude-instant-v1',
  'meta.llama2-13b-chat-v2:0',
  'meta.llama2-70b-chat-v2:0',
  'meta.llama2-7b-chat-v2:0',
  'mistral.mistral-7b-instruct-v0:2',
  'mistral.mixtral-8x7b-instruct-v0:1',
  'mistral.mistral-large-2402-v0:1',
  // OpenAI models
  'gpt-4',
  'gpt-4-turbo-preview',
  'gpt-3.5-turbo',
  // Anthropic models
  'claude-3-opus-20240229',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307'
] as const);

// UUID validation schema
export const UUIDSchema = z.string().uuid();

// Request validation schema
export const ChatRequestSchema = z.object({
  action: z.literal('llm/chat'),
  data: z.object({
    messages: z.array(MessageSchema),
    modelId: ModelIdSchema.optional(),
    stream: z.boolean().optional(),
    systemPrompt: z.string().optional(),
    metadata: z.record(z.any()).optional(),
    maxTokens: z.number().optional(),
    temperature: z.number().optional(),
    conversationId: UUIDSchema.optional()
  })
}); 