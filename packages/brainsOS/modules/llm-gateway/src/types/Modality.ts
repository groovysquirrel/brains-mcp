import { GatewayRequest } from './Request';
import { GatewayResponse } from './Response';
import { ModelConfig } from './Model';

export type ModalityType = 'TEXT' | 'IMAGE' | 'AUDIO' | 'VIDEO';

export interface ModalityConfig {
  name: string;
  displayName: string;
  description: string;
  capabilities: {
    inputTypes: ModalityType[];
    outputTypes: ModalityType[];
    streaming: boolean;
    maxInputTokens: number;
    maxOutputTokens: number;
  };
  defaultSettings: {
    temperature: number;
    topP: number;
    maxTokens: number;
    stopSequences: string[];
  };
  validation: {
    requiresMessages: boolean;
    requiresSystemPrompt: boolean;
    maxMessagesLength: number;
  };
}

export interface ModalityHandler {
  process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse>;
  streamProcess(request: GatewayRequest, model: ModelConfig): AsyncGenerator<GatewayResponse>;
  supportsModality(model: ModelConfig): boolean;
} 