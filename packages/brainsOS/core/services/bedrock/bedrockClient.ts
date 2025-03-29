import { 
  BedrockClient,
  ListFoundationModelsCommand,
} from "@aws-sdk/client-bedrock";

export class BedrockServiceError extends Error {
  constructor(
    message: string, 
    public details: {
      code: string;           // AWS's error code
      message?: string;       // AWS's error message
      requestId?: string;     // AWS request ID
      statusCode: number;     // HTTP status code
      service?: string;       // Service name (bedrock)
      operation?: string;     // Operation name
      modelId?: string;       // Model ID if applicable
      vendor?: string;        // Vendor if applicable
      retryAfter?: string;    // Add this property
      raw?: unknown;          // Original AWS error
    }
  ) {
    super(message);
    this.name = 'BedrockServiceError';
  }
}

export const bedrockClient = new BedrockClient({
  region: process.env.AWS_REGION
});

export async function testConnection(): Promise<boolean> {
  try {
    console.log('Testing Bedrock connection...');
    const command = new ListFoundationModelsCommand({});
    await bedrockClient.send(command);
    console.log('Bedrock connection test successful');
    return true;
  } catch (error) {
    throw new BedrockServiceError('Failed to connect to Bedrock', {
      code: error.name || 'UnknownError',
      message: error.message,
      requestId: error.$metadata?.requestId,
      statusCode: error.$metadata?.httpStatusCode || 500,
      service: 'bedrock',
      operation: 'ListFoundationModels',
      raw: error
    });
  }
}

export async function listModels(source?: string) {
  try {
    const command = new ListFoundationModelsCommand({});
    const response = await bedrockClient.send(command);
    
    console.log('Raw Bedrock ListFoundationModels response:', {
      modelCount: response.modelSummaries?.length,
      models: response.modelSummaries?.map(model => ({
        name: model.modelId,
        provider: model.providerName,
        customizations: model.customizationsSupported,
        inputModalities: model.inputModalities,
        outputModalities: model.outputModalities,
        inferenceTypesSupported: model.inferenceTypesSupported
      }))
    });
    
    if (source?.toLowerCase() === 'bedrock') {
      return response.modelSummaries;
    }
    
    if (source) {
      return response.modelSummaries?.filter(
        model => model.providerName?.toLowerCase() === source.toLowerCase()
      );
    }
    
    return response.modelSummaries;
  } catch (error) {
    console.error('Failed to list Bedrock models:', error);
    throw new BedrockServiceError('Failed to list models', {
      code: error.name || 'UnknownError',
      message: error.message,
      requestId: error.$metadata?.requestId,
      statusCode: error.$metadata?.httpStatusCode || 500,
      service: 'bedrock',
      operation: 'ListFoundationModels',
      raw: error
    });
  }
}