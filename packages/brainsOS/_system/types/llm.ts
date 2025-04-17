import { LLM } from './llmTypes';
import defaultLLMSettings from '../../data/defaults/defaultLLMSettings.json';

interface LLMSettings {
  llms: Array<{
    id: string;
    type: "llm";
    name: string;
    description: string;
    friendlyName: string;
    provider: "anthropic" | "openai" | "mistral" | "bedrock";
    capabilities: string[];
    status: "active" | "inactive" | "error";
    created: string;
    modified: string;
    metadata: Record<string, unknown>;
    configuration: {
      parameters: {
        modelId: string;
        maxTokens: number;
        temperature: number;
      };
    };
  }>;
}

const typedSettings = defaultLLMSettings as LLMSettings;
export const defaultLLMs: LLM[] = typedSettings.llms;