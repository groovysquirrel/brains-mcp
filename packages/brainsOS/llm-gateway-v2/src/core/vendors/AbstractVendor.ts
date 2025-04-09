import { GatewayRequest } from '../../types/Request';
import { VendorConfig } from '../../types/Vendor';
import { Logger } from '../../utils/logging/Logger';
import { ProviderConfig } from '../../types/Provider';
import { ModelConfig } from '../../types/Model';
import { GatewayResponse } from '../../types/Response';
import { AbstractProvider } from '../providers/AbstractProvider';
import { InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { getBedrockClient } from '../../utils/aws/BedrockClient';

export abstract class AbstractVendor {
  protected config: VendorConfig;
  protected providerConfig: ProviderConfig;
  protected logger: Logger;
  protected lastContent: Map<string, string>;

  constructor(config: VendorConfig, providerConfig: ProviderConfig) {
    this.config = config;
    this.providerConfig = providerConfig;
    this.logger = new Logger(this.constructor.name);
    this.lastContent = new Map();
  }

  /**
   * Format a request according to vendor-specific requirements
   */
  abstract formatRequest(request: GatewayRequest, modelId: string): Record<string, unknown>;

  /**
   * Validate that a request meets vendor-specific requirements
   */
  abstract validateRequest(request: GatewayRequest): void;

  /**
   * Get vendor-specific default settings
   */
  abstract getDefaultSettings(): {
    temperature?: number;
    topP?: number;
    maxTokens?: number;
    stopSequences?: string[];
  };

  /**
   * Get the API format for a given model ID
   */
  abstract getApiFormat(modelId: string): string;

  /**
   * Format a response from the vendor's API into a standard format
   */
  abstract formatResponse(response: unknown): {
    content: string;
    metadata?: Record<string, unknown>;
  };

  /**
   * Process a streaming response chunk from the provider
   * @param chunk - The raw chunk from the provider
   * @param modelId - The model ID that generated this chunk
   * @returns A processed chunk with content and metadata, or null if the chunk should be ignored
   */
  abstract processStreamChunk(chunk: unknown, modelId: string): { content: string; metadata?: Record<string, unknown> } | null;

  /**
   * Handle streaming response from Bedrock
   */
  protected async *handleStreamingResponse(
    response: any,
    modelId: string,
    provider: AbstractProvider,
    request: GatewayRequest
  ): AsyncGenerator<GatewayResponse> {
    let currentGroup: string[] = [];
    const groupSize = request.tokenGrouping || 1;
    let packetNumber = 0;
    let promptTokens = 0;
    let completionTokens = 0;

    for await (const item of response.body) {
      if (item.chunk?.bytes) {
        const chunk = JSON.parse(new TextDecoder().decode(item.chunk.bytes));
        const processedChunk = this.processStreamChunk(chunk, modelId);
        
        if (processedChunk) {
          // Update token counts if available in the processed chunk
          if (processedChunk.metadata?.usage) {
            const usage = processedChunk.metadata.usage as Record<string, number>;
            promptTokens = usage.promptTokens || 0;
            completionTokens = usage.completionTokens || 0;
            
            this.logger.debug('Updated token counts from chunk', {
              modelId,
              promptTokens,
              completionTokens,
              totalTokens: promptTokens + completionTokens
            });
          } 
          // Also check original chunk format
          else if (chunk.usage) {
            promptTokens = chunk.usage.input_tokens || 0;
            completionTokens = chunk.usage.output_tokens || 0;
            
            this.logger.debug('Updated token counts from raw chunk', {
              modelId,
              promptTokens,
              completionTokens
            });
          }

          // Add content to current group
          if (processedChunk.content) {
            currentGroup.push(processedChunk.content);
          }

          // Yield when group is full or it's the last chunk
          if (currentGroup.length >= groupSize || processedChunk.metadata?.isStreaming === false) {
            packetNumber++;
            const groupedContent = currentGroup.join('');
            currentGroup = [];

            yield {
              content: groupedContent,
              metadata: {
                ...processedChunk.metadata,
                model: modelId,
                packetNumber,
                usage: {
                  promptTokens,
                  completionTokens,
                  totalTokens: promptTokens + completionTokens
                }
              }
            };
          }
        }
      }
    }

    // Yield any remaining content
    if (currentGroup.length > 0) {
      packetNumber++;
      yield {
        content: currentGroup.join(''),
        metadata: {
          model: modelId,
          packetNumber,
          usage: {
            promptTokens,
            completionTokens,
            totalTokens: promptTokens + completionTokens
          },
          isStreaming: true
        }
      };
    }
  }

  /**
   * Send a streaming request to Bedrock
   */
  protected async sendStreamingRequest(
    request: GatewayRequest,
    model: ModelConfig,
    provider: AbstractProvider
  ): Promise<any> {
    const formattedRequest = this.formatRequest(request, model.modelId);
    
    this.logger.debug('Sending streaming request to Bedrock', {
      modelId: model.modelId,
      formattedRequest
    });

    const command = new InvokeModelWithResponseStreamCommand({
      modelId: model.modelId,
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify(formattedRequest)
    });

    // Use the shared Bedrock client
    const bedrock = getBedrockClient();
    const response = await bedrock.send(command);
    
    this.logger.debug('Received streaming response from Bedrock', {
      modelId: model.modelId,
      hasResponseBody: !!response.body
    });

    if (!response.body) {
      throw new Error('No response body received from Bedrock');
    }

    return response;
  }

  /**
   * Process a non-streaming request
   */
  abstract process(request: GatewayRequest, model: ModelConfig): Promise<GatewayResponse>;

  /**
   * Process a streaming request
   */
  async *streamProcess(request: GatewayRequest, model: ModelConfig, provider: AbstractProvider): AsyncGenerator<GatewayResponse> {
    try {
      const response = await this.sendStreamingRequest(request, model, provider);
      yield* this.handleStreamingResponse(response, model.modelId, provider, request);
    } catch (error) {
      this.logger.error('Error in streaming:', { 
        error: error instanceof Error ? error.message : String(error),
        modelId: model.modelId
      });
      throw error;
    }
  }

  supportsModality(model: ModelConfig): boolean {
    const modelModalities = new Set([...model.capabilities.modalities.input, ...model.capabilities.modalities.output]);
    return this.config.capabilities.modalities.some((modality: string) => 
      modelModalities.has(modality.toLowerCase())
    );
  }
} 