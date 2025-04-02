import { BaseVersionedObject } from '../base/versionedRepository';

// Interface for prompts as they are stored in the database
export interface StoredPrompt extends BaseVersionedObject {
  name: string;
  version: string;
  createdBy: string;
  content: string;
  description?: string;
  tags?: string[];
  updatedBy?: string;
  metadata?: {
    userEmail?: string;
    userArn?: string;
    createdAt?: string;
    lastModifiedAt?: string;
    [key: string]: any;
  };
}

// Interface for prompts as they are used in the application
export interface Prompt extends BaseVersionedObject {
  name: string;
  version: string;
  createdBy: string;
  content: {
    prompt?: string;
    template?: string;
    defaultModel?: string;
    parameters?: Record<string, any>;
    [key: string]: any;
  };
  description?: string;
  tags?: string[];
  updatedBy?: string;
  metadata?: {
    userEmail?: string;
    userArn?: string;
    createdAt?: string;
    lastModifiedAt?: string;
    [key: string]: any;
  };
}

// Type guard for StoredPrompt
export const isStoredPrompt = (obj: any): obj is StoredPrompt => {
  return (
    obj &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.createdBy === 'string' &&
    typeof obj.content === 'string'
  );
};

// Type guard for Prompt
export const isPrompt = (obj: any): obj is Prompt => {
  return (
    obj &&
    typeof obj.name === 'string' &&
    typeof obj.version === 'string' &&
    typeof obj.createdBy === 'string' &&
    typeof obj.content === 'object'
  );
};

// Conversion function
export const toStoredPrompt = (input: any): StoredPrompt => {
  return {
    userId: input.userId || 'system',
    dataType: 'prompt',
    updatedAt: new Date().toISOString(),
    name: input.name,
    version: input.version,
    createdBy: input.createdBy,
    content: input.content.prompt || input.content.template || '',
    description: input.description,
    tags: input.tags,
    updatedBy: input.updatedBy,
    metadata: {
      userEmail: input.metadata?.userEmail,
      userArn: input.metadata?.userArn,
      createdAt: input.metadata?.createdAt,
      lastModifiedAt: input.metadata?.lastModifiedAt,
    },
  };
};
