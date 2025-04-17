import { ListCommandRequest } from './listCommandTypes';
import { createResponse } from '../../../utils/http/response';
import { listModels, BedrockServiceError } from '../../services/bedrock/bedrockClient';
import { userLLMRepository, systemLLMRepository } from '../../repositories/llm/llmRepository';
import { LLM } from '../../types/llmTypes';
import Table from 'cli-table3';

interface ModelSummary {
  modelId: string;
  vendorName?: string;
}

function formatBedrockModels(models: ModelSummary[]) {
  const groupedModels = (models || []).reduce((acc, model) => {
    const vendor = model.vendorName || 'Unknown';
    if (!acc[vendor]) {
      acc[vendor] = [];
    }
    acc[vendor].push(model.modelId);
    return acc;
  }, {} as Record<string, string[]>);

  const totalModels = Object.values(groupedModels).reduce((sum, models) => sum + models.length, 0);
  
  const message = [`Available Bedrock Models (${totalModels} total):`];
  Object.entries(groupedModels).forEach(([vendor, models]) => {
    models.sort();
    message.push(`${vendor} (${models.length}):`);
    models.forEach(model => message.push(`  ${model}`));
  });

  return {
    vendors: groupedModels,
    totalVendors: Object.keys(groupedModels).length,
    totalModels,
    message: message.join('\r\n')
  };
}

function formatLocalLLMs(llms: LLM[]) {
  const table = new Table({
    head: ['Model ID', 'Vendor', 'Status', 'Capabilities']
  });

  llms.forEach(llm => {
    table.push([
      llm.id,
      llm.vendor,
      llm.status,
    ]);
  });

  return {
    models: llms,
    totalModels: llms.length,
    message: table.toString()
  };
}

export async function handleListCommand(command: ListCommandRequest) {
  try {
    console.log('Handling list command:', command);

    if (!command.user.userId) {
      throw new Error('Missing userId in user context');
    }

    if (command.object === 'llm') {
      const sourceParam = command.parameters.find(p => p.startsWith('source='));
      const source = sourceParam?.split('=')[1];

      try {
        if (source === 'bedrock') {
          const rawModels = await listModels(source);
          const formattedModels = formatBedrockModels(rawModels);
          
          return createResponse(200, {
            success: true,
            data: {
              ...formattedModels,
              source: 'bedrock',
              timestamp: new Date().toISOString()
            }
          });
        } else {
          // Default to showing local LLMs from DynamoDB
          const llms = await systemLLMRepository.getLLMs(command.user.userId);
          const formattedLLMs = formatLocalLLMs(llms);
          
          return createResponse(200, {
            success: true,
            data: {
              ...formattedLLMs,
              source: 'local',
              timestamp: new Date().toISOString()
            }
          });
        }
      } catch (error) {
        if (error instanceof BedrockServiceError) {
          return createResponse(503, {
            success: false,
            error: error.details.message || error.message
          });
        }
        throw error;
      }
    }

    return createResponse(400, {
      success: false,
      error: `Invalid list object: ${command.object}`
    });
  } catch (error) {
    return createResponse(500, {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
