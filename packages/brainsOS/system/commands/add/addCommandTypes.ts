import { z } from 'zod';
import { CommandRequest } from '../_core/registry/commandRegistry';

// Valid objects that can be added
export const AddableObjects = ['template', 'llm', 'prompt', 'cnode'] as const;
export type AddableObject = typeof AddableObjects[number];

// Type for the add command request
export interface AddCommandRequest extends CommandRequest {
    action: 'add';
    object: AddableObject;
    parameters: string[];
    flags: {
        templateName?: string;
        llmName?: string;
        promptName?: string;
        cnodeName?: string;
        [key: string]: string | boolean | undefined;
    };
}

// Zod schema for validating add commands
export const AddCommandSchema = z.object({
    action: z.literal('add'),
    object: z.enum(AddableObjects),
    parameters: z.array(z.string()),
    flags: z.record(z.union([z.string(), z.boolean()])),
    raw: z.string()
});

// Type for successful add command responses
export interface AddCommandSuccess {
    itemId: string;
    type: AddableObject;
    createdAt: string;
    [key: string]: unknown;
}