import { 
  InvokeModelCommand, 
  ConverseCommand,
  InvokeModelCommandInput,
  ConverseCommandInput,
  InvokeModelCommandOutput,
  ConverseCommandOutput
} from "@aws-sdk/client-bedrock-runtime";
import { InvocationParams, InvocationResponse } from './modelInvocation';

type BedrockCommand = InvokeModelCommand | ConverseCommand;
type BedrockResponse = InvokeModelCommandOutput | ConverseCommandOutput;

// Add type guards at the top
function isInvokeModelResponse(response: BedrockResponse): response is InvokeModelCommandOutput {
  return 'body' in response;
}

function isConverseResponse(response: BedrockResponse): response is ConverseCommandOutput {
  return 'output' in response;
}

export interface VendorConfig {
  apiVersion: string;
  prepareRequest: (params: InvocationParams) => Promise<{
    command: BedrockCommand;
    parseResponse: (response: BedrockResponse) => InvocationResponse;
  }>;
}

export const VendorConfigs: Record<string, VendorConfig> = {
  'anthropic': {
    apiVersion: "bedrock-2023-05-31",
    prepareRequest: async (params) => {
      const isClaudeThree = params.modelId.includes('claude-3');

      if (isClaudeThree) {
        // Prepare messages array for Claude 3
        const messages = [];
        
        // Add message history if available
        if (params.messageHistory && params.messageHistory.length > 0) {
          messages.push(...params.messageHistory.map(msg => ({
            role: msg.role,
            content: Array.isArray(msg.content) ? msg.content : [
              {
                type: "text",
                text: msg.content
              }
            ]
          })));
        }
        
        // Add current message
        messages.push({
          role: "user",
          content: [
            {
              type: "text",
              text: params.prompt
            }
          ]
        });

        const input: InvokeModelCommandInput = {
          modelId: params.modelId,
          body: JSON.stringify({
            anthropic_version: "bedrock-2023-05-31",
            max_tokens: params.maxTokens || 2000,
            messages: messages,
            ...(params.systemPrompt && { system: params.systemPrompt }),
            temperature: params.temperature || 0.7,
            top_p: 1,
            top_k: 250
          }),
          contentType: 'application/json',
          accept: 'application/json',
        };

        return {
          command: new InvokeModelCommand(input),
          parseResponse: (response: BedrockResponse) => {
            if (!isInvokeModelResponse(response)) {
              throw new Error('Unexpected response type from InvokeModel API');
            }
            const body = JSON.parse(new TextDecoder().decode(response.body));
            return {
              content: body.content[0].text || '',
              usage: {
                promptTokens: body.usage?.input_tokens || 0,
                completionTokens: body.usage?.output_tokens || 0,
                totalTokens: (body.usage?.input_tokens || 0) + (body.usage?.output_tokens || 0)
              }
            };
          }
        };
      }

      // Legacy format for older Claude models
      const messages = [];
      
      // Add system prompt if available
      if (params.systemPrompt) {
        messages.push(`\n\nHuman: ${params.systemPrompt}\n\nAssistant: I understand and will proceed as instructed.`);
      }

      // Add message history if available
      if (params.messageHistory && params.messageHistory.length > 0) {
        messages.push(...params.messageHistory.map(msg => 
          `\n\n${msg.role === 'user' ? 'Human' : 'Assistant'}: ${msg.content}`
        ));
      }

      // Add current message
      messages.push(`\n\nHuman: ${params.prompt}\n\nAssistant:`);

      const input: InvokeModelCommandInput = {
        modelId: params.modelId,
        body: JSON.stringify({
          prompt: messages.join(''),
          max_tokens_to_sample: params.maxTokens || 2000,
          temperature: params.temperature || 0.7,
          top_p: 1,
          top_k: 250,
          stop_sequences: ["\n\nHuman:", "\n\nAssistant:"]
        }),
        contentType: 'application/json',
        accept: 'application/json',
      };

      return {
        command: new InvokeModelCommand(input),
        parseResponse: (response: BedrockResponse) => {
          if (!isInvokeModelResponse(response)) {
            throw new Error('Unexpected response type from InvokeModel API');
          }
          const body = JSON.parse(new TextDecoder().decode(response.body));
          return {
            content: body.completion?.trim() || '',
            usage: {
              promptTokens: body.usage?.input_tokens || 0,
              completionTokens: body.usage?.output_tokens || 0,
              totalTokens: (body.usage?.input_tokens || 0) + (body.usage?.output_tokens || 0)
            }
          };
        }
      };
    }
  },
  'meta': {
    apiVersion: "2024-01",
    prepareRequest: async (params) => {
      const input: InvokeModelCommandInput = {
        modelId: params.modelId,
        body: JSON.stringify({
          prompt: params.systemPrompt 
            ? `System: ${params.systemPrompt}\n\nHuman: ${params.prompt}\n\nAssistant:`
            : `Human: ${params.prompt}\n\nAssistant:`,
          max_gen_len: params.maxTokens || 512,
          temperature: params.temperature || 0.7,
          top_p: 0.9
        }),
        contentType: 'application/json',
        accept: 'application/json',
      };

      return {
        command: new InvokeModelCommand(input),
        parseResponse: (response: BedrockResponse) => {
          if (!isInvokeModelResponse(response)) {
            throw new Error('Unexpected response type from InvokeModel API');
          }
          const body = JSON.parse(new TextDecoder().decode(response.body));
          return {
            content: body.generation?.trim() || '',
            usage: {
              promptTokens: body.prompt_token_count || 0,
              completionTokens: body.generation_token_count || 0,
              totalTokens: (body.prompt_token_count || 0) + (body.generation_token_count || 0)
            }
          };
        }
      };
    }
  }
};