import { BedrockChat } from "@langchain/community/chat_models/bedrock";
import { SystemMessage, BaseMessage } from "@langchain/core/messages";
import { ModelProvider, ModelConfig, ChatRequest, ChatResponse, ProviderConfig, BedrockModel } from "./types";

/**
 * LLMGateway handles communication with LLM providers.
 * 
 * TODO: Support both streaming and message APIs for Bedrock:
 * - Currently using Messages API for Claude 3
 * - Need to add support for streaming API for other models
 * - Consider adding a configuration option to choose between APIs
 * - Update model configurations to specify which API to use
 */
export class LLMGateway {
  private providers: Map<ModelProvider, BedrockChat> = new Map();
  private providerConfigs: Map<ModelProvider, ProviderConfig> = new Map();
  private model: BedrockChat;

  constructor(providerConfigs: Record<ModelProvider, ProviderConfig>) {
    this.initializeProviders(providerConfigs);
  }

  private initializeProviders(configs: Record<ModelProvider, ProviderConfig>) {
    if (configs.bedrock) {
      const model = new BedrockChat({
        model: "anthropic.claude-3-sonnet-20240229-v1:0",
        region: configs.bedrock.region || "us-east-1",
        credentials: configs.bedrock.credentials,
        maxTokens: 4000,
        temperature: 0.7,
        modelKwargs: {
          anthropic_version: "bedrock-2023-05-31"
        }
      });
      this.providers.set('bedrock', model);
      this.providerConfigs.set('bedrock', configs.bedrock);
      this.model = model;
    }
  }

  private getModelConfig(modelId: BedrockModel): { maxTokens: number; temperature: number } {
    const modelConfigs = {
      'anthropic.claude-3-sonnet-20240229-v1:0': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-3-haiku-20240307-v1:0': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-2.1': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-2': { maxTokens: 4000, temperature: 0.7 },
      'anthropic.claude-instant-v1': { maxTokens: 4000, temperature: 0.7 },
      'meta.llama2-13b-chat-v2:0': { maxTokens: 2048, temperature: 0.7 },
      'meta.llama2-70b-chat-v2:0': { maxTokens: 2048, temperature: 0.7 },
      'meta.llama2-7b-chat-v2:0': { maxTokens: 2048, temperature: 0.7 },
      'mistral.mistral-7b-instruct-v0:2': { maxTokens: 2048, temperature: 0.7 },
      'mistral.mixtral-8x7b-instruct-v0:1': { maxTokens: 2048, temperature: 0.7 },
      'mistral.mistral-large-2402-v0:1': { maxTokens: 2048, temperature: 0.7 }
    } as const;

    return modelConfigs[modelId];
  }

  async chat(request: ChatRequest): Promise<ChatResponse> {
    const { messages, modelConfig, systemPrompt, metadata } = request;
    const provider = modelConfig.provider;
    const model = this.providers.get(provider);

    if (!model) {
      throw new Error(`Provider ${provider} not initialized`);
    }

    try {
      if (this.model.model !== modelConfig.modelId) {
        const config = this.getModelConfig(modelConfig.modelId);
        this.model = new BedrockChat({
          model: modelConfig.modelId,
          region: this.providerConfigs.get('bedrock')?.region || 'us-east-1',
          credentials: this.providerConfigs.get('bedrock')?.credentials,
          maxTokens: modelConfig.maxTokens || config.maxTokens,
          temperature: modelConfig.temperature || config.temperature,
          modelKwargs: {
            anthropic_version: "bedrock-2023-05-31"
          }
        });
      }

      const preparedMessages: BaseMessage[] = [];
      if (systemPrompt) {
        preparedMessages.push(new SystemMessage(systemPrompt));
      }
      preparedMessages.push(...messages);

      const response = await this.model.invoke(preparedMessages);

      return {
        content: String(response.content),
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
        metadata: {
          ...metadata,
          provider,
          modelId: modelConfig.modelId,
          timestamp: new Date().toISOString(),
        }
      };
    } catch (error) {
      throw new Error(`Failed to invoke ${modelConfig.modelId}: ${error.message}`);
    }
  }
} 