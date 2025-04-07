import { AbstractProvider } from './AbstractProvider';
import { GatewayRequest } from '../types/Request';
import { ModelConfig } from '../types/Model';
import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime';
import { AbstractVendor } from '../vendors/AbstractVendor';
import { ProviderConfig } from '../types/Provider';
import { VendorConfig } from '../types/Vendor';
import { AnthropicVendor } from '../vendors/AnthropicVendor';
import { MetaVendor } from '../vendors/MetaVendor';

export class BedrockProvider extends AbstractProvider {
  private bedrock: BedrockRuntimeClient;
  private vendorConfigs: Record<string, VendorConfig>;

  constructor(config: ProviderConfig, vendorConfigs: Record<string, VendorConfig>) {
    super(config);
    this.bedrock = new BedrockRuntimeClient({});
    this.vendorConfigs = vendorConfigs;
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

    console.debug('Sending request to Bedrock:', {
      modelId: model.modelId,
      request: formattedRequest
    });

    try {
      const command = new InvokeModelCommand({
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(formattedRequest)
      });

      const response = await this.bedrock.send(command);
      
      console.debug('Received response from Bedrock:', {
        modelId: model.modelId,
        response
      });

      // Decode the response body
      const responseBody = new TextDecoder().decode(response.body);
      const parsedResponse = JSON.parse(responseBody);

      console.debug('Parsed response from Bedrock:', {
        modelId: model.modelId,
        parsedResponse
      });

      return vendor.formatResponse({
        ...parsedResponse,
        model: model.modelId
      });
    } catch (error) {
      console.error('Error in Bedrock chat:', {
        error,
        modelId: model.modelId,
        request: formattedRequest
      });
      throw error;
    }
  }

  async *streamChat(request: GatewayRequest, model: ModelConfig): AsyncGenerator<{ content: string; metadata?: Record<string, unknown> }> {
    const vendor = this.getVendor(model.modelId);
    const formattedRequest = vendor.formatRequest(request, model.modelId);

    console.debug('Sending streaming request to Bedrock:', {
      modelId: model.modelId,
      request: formattedRequest
    });

    try {
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: model.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: JSON.stringify(formattedRequest)
      });

      const response = await this.bedrock.send(command);
      
      if (!response.body) {
        throw new Error('No response body received from Bedrock');
      }

      for await (const chunk of vendor.streamProcess(request, model, this)) {
        yield chunk;
      }
    } catch (error) {
      console.error('Error in Bedrock streamChat:', {
        error,
        modelId: model.modelId,
        request: formattedRequest
      });
      throw error;
    }
  }
} 