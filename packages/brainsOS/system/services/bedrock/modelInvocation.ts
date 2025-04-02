import { 
  BedrockRuntimeClient, 
  InvokeModelCommand, 
  ConverseCommand,
  InvokeModelCommandOutput,
  ConverseCommandOutput,
  ServiceInputTypes,
  ServiceOutputTypes,
  BedrockRuntimeClientResolvedConfig
} from "@aws-sdk/client-bedrock-runtime";
import { BedrockServiceError } from "./bedrockClient";
import { VendorConfigs } from './vendorConfig';

type BedrockResponse = InvokeModelCommandOutput | ConverseCommandOutput;

const runtimeClient = new BedrockRuntimeClient({
  requestHandler: {
    timeoutInMs: 120000,
  },
  maxAttempts: 3,
  retryMode: 'adaptive',
});

export interface InvocationParams {
  modelId: string;
  vendor: string;
  source: string;
  prompt: string;
  systemPrompt?: string;
  temperature?: number;
  maxTokens?: number;
  messageHistory?: Array<{
    role: 'system' | 'user' | 'assistant';
    content: string;
  }>;
}

export interface InvocationResponse {
  content: string;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export async function invokeModel(params: InvocationParams): Promise<InvocationResponse> {
  const vendor = params.modelId.split('.')[0];
  const config = VendorConfigs[vendor];
  
  if (!config) {
    throw new BedrockServiceError('Unsupported model vendor', {
      message: `Vendor '${vendor}' is not supported`,
      code: 'UnsupportedModelError',
      service: 'bedrock',
      operation: 'invokeModel',
      statusCode: 400
    });
  }

  try {
    const { command, parseResponse } = await config.prepareRequest(params);
    
    let response: BedrockResponse;
    if (command instanceof ConverseCommand) {
      response = await runtimeClient.send(command);
    } else {
      response = await runtimeClient.send(command);
    }
    
    return parseResponse(response);
  } catch (error) {
    if (error.name === 'ThrottlingException' || error.message?.includes('Too many requests')) {
      const baseDelay = 15000;
      const jitter = Math.random() * 5000;
      const retryAfter = baseDelay + jitter;

      throw new BedrockServiceError('Rate limit exceeded', {
        code: 'RateLimitExceeded',
        service: 'bedrock',
        operation: 'invokeModel',
        statusCode: 429,
        modelId: params.modelId,
        vendor: params.vendor,
        retryAfter: retryAfter.toString(),
        raw: error
      });
    }
    
    throw new BedrockServiceError(error.message || 'Failed to invoke Bedrock model', {
      code: 'InvocationError',
      service: 'bedrock',
      operation: 'invokeModel',
      statusCode: 500,
      modelId: params.modelId,
      vendor: params.vendor,
      raw: error
    });
  }
}