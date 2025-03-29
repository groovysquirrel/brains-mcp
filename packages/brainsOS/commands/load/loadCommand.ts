import { LoadCommandRequest } from './loadCommandTypes';
import { createResponse } from '../../utils/http/response';
import { listModels, BedrockServiceError } from '../../core/services/bedrock/bedrockClient';
import { LLM } from '../../core/types/llmTypes';
import { defaultLLMs } from '../../core/types/llm';
import { userLLMRepository, systemLLMRepository } from '../../core/repositories/llm/llmRepository';
import { InferenceType, Support } from '../../core/services/bedrock/bedrockTypes';

interface LoadCommandParams {
  reset?: boolean;
  source?: string;
  vendor?: string;
  model?: string;
  support?: string;
}

function parseLoadParameters(params: string[]): LoadCommandParams {
  console.log('Parsing load parameters:', params);
  const result: LoadCommandParams = {};
  
  params.forEach(param => {
    console.log('Processing parameter:', param);
    if (param === 'reset') {
      result.reset = true;
      return;
    }
    
    if (!param.includes('=')) {
      console.log('Skipping non key=value parameter:', param);
      return;
    }
    
    const [key, value] = param.split('=');
    console.log('Split parameter:', { key, value });
    switch (key) {
      case 'source':
      case 'vendor':
      case 'model':
      case 'support':
        result[key] = value;
        break;
    }
  });

  console.log('Parsed parameters:', result);
  return result;
}

async function handleReset(userId: string): Promise<string[]> {
  await systemLLMRepository.deleteLLMs(userId);
  
  const restoredModels = [];
  for (const llm of defaultLLMs) {
    await systemLLMRepository.saveLLM(userId, llm);
    restoredModels.push(llm.id);
  }
  
  return restoredModels;
}

export async function handleLoadCommand(command: LoadCommandRequest) {
  try {
    console.log('Handling load command with user:', command.user);
    
    if (!command.user.userId) {
      throw new Error('Missing userId in user context');
    }

    const params = parseLoadParameters(command.parameters);

    switch (command.object) {
      case 'llm': {
        if (params.reset) {
          const restoredModels = await handleReset(command.user.userId);
          return createResponse(200, {
            success: true,
            data: {
              message: `Reset complete. Restored ${restoredModels.length} default LLMs`,
              models: restoredModels
            }
          });
        }

        // If no source is provided, default to reset behavior
        if (!params.source) {
          const restoredModels = await handleReset(command.user.userId);
          return createResponse(200, {
            success: true,
            data: {
              message: `Reset LLM configuration data to default values. Added ${restoredModels.length} default LLMs configurations.`,
              models: restoredModels
            }
          });
        }

        if (params.source === 'bedrock') {
          try {
            const models = await listModels(params.vendor);
            let filteredModels = models;
            
            if (params.support) {
              filteredModels = models.filter(m => 
                m.inferenceTypesSupported?.includes(params.support as Support)
              );
            }

            const savedModels = [];
            for (const model of filteredModels) {
              if (params.model && model.modelId !== params.model) {
                continue;
              }

              let defaultMaxTokens = 200000;
              if (model.providerName?.toLowerCase().includes('anthropic')) {
                defaultMaxTokens = 100000;
              } else if (model.providerName?.toLowerCase().includes('amazon')) {
                defaultMaxTokens = 4096;
              }

              const llm: LLM = {
                id: model.modelId,
                modelId: model.modelId,
                type: 'llm',
                name: model.modelName || model.modelId,
                vendor: model.providerName || 'unknown',
                status: 'active',
                maxTokens: defaultMaxTokens
              };

              await systemLLMRepository.saveLLM(command.user.userId, llm);
              savedModels.push(model.modelId);
            }

            return createResponse(200, {
              success: true,
              data: {
                message: `Loaded ${savedModels.length} models from Bedrock`,
                models: savedModels
              }
            });
          } catch (error) {
            if (error instanceof BedrockServiceError) {
              return createResponse(500, {
                success: false,
                error: error.details.message || error.message
              });
            }
            throw error;
          }
        }

        return createResponse(400, {
          success: false,
          error: `Invalid source: ${params.source}. Available sources: bedrock`
        });
      }

      default:
        return createResponse(400, {
          success: false,
          error: `Unsupported load object: ${command.object}`
        });
    }
  } catch (error) {
    console.error('Error in handleLoadCommand:', error);
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}