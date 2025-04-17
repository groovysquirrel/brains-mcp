import { ShowCommandRequest } from './showCommandTypes';
import { createResponse } from '../../../utils/http/response';
import { systemRepository } from '../../repositories/system/systemRepository';
import { systemLLMRepository } from '../../repositories/llm/llmRepository';
import { listModels, BedrockServiceError } from '../../services/bedrock/bedrockClient';
import { InferenceType } from '@aws-sdk/client-bedrock';

export async function handleShowCommand(command: ShowCommandRequest) {
  try {
    const { object, flags, parameters } = command;
    
    switch (object) {
      case 'system':
        const systemInfo = await systemRepository.getSettings(command.user);
        return createResponse(200, {
          success: true,
          data: flags.json ? systemInfo : {
            summary: `System Status: ${systemInfo.status || 'unknown'}`,
            ...systemInfo
          }
        });

      case 'model':
      case 'llm':
        const sourceParam = parameters.find(p => p.startsWith('source='));
        const supportParam = parameters.find(p => p.startsWith('support='));
        const source = sourceParam?.split('=')[1];
        const support = supportParam?.split('=')[1] as InferenceType;
        const modelId = parameters.find(p => !p.includes('='));
        
        if (source === 'bedrock') {
          const rawModels = await listModels(source);
          const filteredModels = support 
            ? rawModels.filter(m => m.inferenceTypesSupported?.includes(support))
            : rawModels;

          return createResponse(200, {
            success: true,
            data: {
              summary: `${filteredModels.length} Bedrock models available at ${new Date().toLocaleString()}`,
              models: filteredModels.map(m => flags.detail ? {
                ...m,
                id: m.modelId,
                source: 'bedrock',
                vendor: m.providerName
              } : {
                id: m.modelId,
                source: 'bedrock',
                name: m.modelName || m.modelId,
                status: 'available'
              })
            }
          });
        }

        const models = await systemLLMRepository.getLLMs(command.user.userId);

        if (modelId) {
          const modelInfo = models.find(m => m.id === modelId);
          if (!modelInfo) {
            throw new Error(`Model ${modelId} not found`);
          }
          return createResponse(200, {
            success: true,
            data: flags.json ? modelInfo : {
              summary: `Model: ${modelInfo.id}`,
              ...modelInfo
            }
          });
        } else {
          // Show all models
          return createResponse(200, {
            success: true,
            data: flags.json ? models : {
              summary: `${models.length} models loaded from ${command.user.userId} at ${new Date().toLocaleString()}`,
              models: models.map(m => flags.detail ? {
                id: m.id,
                name: m.name || m.id,
                vendor: m.vendor,
                status: m.status,
                maxTokens: m.maxTokens,
                created: m.created
              } : {
                id: m.id,
                name: m.name || m.id,
                vendor: m.vendor,
                status: m.status
              })
            }
          });
        }

      default:
        return createResponse(400, {
          success: false,
          error: `Invalid show object: ${object}`
        });
    }
  } catch (error) {
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}