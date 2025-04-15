import { AbstractProvider } from './AbstractProvider';
import { GatewayRequest } from '../../types/Request';
import { ModelConfig } from '../../types/Model';
import { InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { AbstractVendor } from '../vendors/AbstractVendor';
import { ProviderConfig } from '../../types/Provider';
import { VendorConfig } from '../../types/Vendor';
import { AnthropicVendor } from '../vendors/AnthropicVendor';
import { MetaVendor } from '../vendors/MetaVendor';
import { getBedrockClient } from '../../../../utils/aws/BedrockClient';
import { Logger } from '../../../../utils/logging/Logger';

export class BedrockProvider extends AbstractProvider {
  private vendorConfigs: Record<string, VendorConfig>;
  protected logger: Logger;

  constructor(config: ProviderConfig, vendorConfigs: Record<string, VendorConfig>) {
    super(config);
    this.vendorConfigs = vendorConfigs;
    this.logger = new Logger('BedrockProvider');
  }

  protected getVendor(modelId: string): AbstractVendor {
    const vendorName = modelId.split('.')[0];
    
    switch (vendorName.toLowerCase()) {
      case 'anthropic':
        return new AnthropicVendor(this.vendorConfigs.anthropic, this.config);
      case 'meta':
        return new MetaVendor(this.vendorConfigs.meta, this.config);
      default:
        throw new Error(`No vendor handler implemented for ${vendorName}`);
    }
  }

  supportsVendor(vendor: string): boolean {
    return ['anthropic', 'meta'].includes(vendor.toLowerCase());
  }

  async chat(request: GatewayRequest, model: ModelConfig): Promise<{ content: string; metadata?: Record<string, unknown> }> {
    const vendor = this.getVendor(model.modelId);
    const formattedRequest = vendor.formatRequest(request, model.modelId);

    this.logger.debug('Sending request to Bedrock:', {
      modelId: model.modelId,
      request: formattedRequest
    });

    try {
      // Get the shared Bedrock client
      const bedrock = getBedrockClient();
      
      const command = new InvokeModelCommand({
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(formattedRequest)
      });

      const response = await bedrock.send(command);
      
      this.logger.debug('Received response from Bedrock:', {
        modelId: model.modelId,
        response
      });

      // Decode the response body
      const responseBody = new TextDecoder().decode(response.body);
      const parsedResponse = JSON.parse(responseBody);

      this.logger.debug('Parsed response from Bedrock:', {
        modelId: model.modelId,
        parsedResponse
      });

      return vendor.formatResponse({
        ...parsedResponse,
        model: model.modelId
      });
    } catch (error) {
      this.logger.error('Error in Bedrock chat:', {
        error,
        modelId: model.modelId,
        request: formattedRequest
      });
      throw error;
    }
  }

  async *streamChat(request: GatewayRequest, model: ModelConfig): AsyncGenerator<{ content: string; metadata?: Record<string, unknown> }> {
    const vendor = this.getVendor(model.modelId);
    
    // Validate the request
    this.validateRequest(request, model);
    vendor.validateRequest(request);

    this.logger.debug('Starting streaming chat with Bedrock', {
      modelId: model.modelId,
      streaming: true
    });

    try {
      // Use the vendor's streamProcess method which now gets the Bedrock client correctly
      yield* vendor.streamProcess(request, model, this);
    } catch (error) {
      this.logger.error('Error in Bedrock streamChat:', {
        error,
        modelId: model.modelId
      });
      throw error;
    }
  }
} 