import { ModelCapabilities } from '../../types';
import bedrockModels from '../../config/bedrock/bedrockModels.json';

interface BedrockModelDetails {
  modelId: string;
  modelName: string;
  providerName: string;
  inferenceTypesSupported: string[];
  inputModalities: string[];
  outputModalities: string[];
  customizationsSupported: string[];
  modelArn: string;
}

export class ModelValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ModelValidationError';
  }
}

export class BedrockModelValidator {
  private static validateModel(modelId: string): BedrockModelDetails {
    const model = bedrockModels[modelId];
    if (!model) {
      throw new ModelValidationError(`Model ${modelId} not found in Bedrock configuration`);
    }
    return model;
  }

  private static validateInferenceType(model: BedrockModelDetails): void {
    if (!model.inferenceTypesSupported.includes('ON_DEMAND')) {
      throw new ModelValidationError(
        `Model ${model.modelId} is not supported. We currently only support on-demand foundational models.`
      );
    }
  }

  private static validateModalities(model: BedrockModelDetails): void {
    if (!model.inputModalities.includes('TEXT')) {
      throw new ModelValidationError(
        `Model ${model.modelId} does not support text input`
      );
    }
    if (!model.outputModalities.includes('TEXT')) {
      throw new ModelValidationError(
        `Model ${model.modelId} does not support text output`
      );
    }
  }

  public static validateModelCapabilities(modelId: string, requiredCapabilities: Partial<ModelCapabilities>): void {
    const model = this.validateModel(modelId);
    
    // Always validate inference type and modalities first
    this.validateInferenceType(model);
    this.validateModalities(model);

    // Validate streaming capability if required
    if (requiredCapabilities.supportsStreaming) {
      if (!model.inferenceTypesSupported.includes('ON_DEMAND')) {
        throw new ModelValidationError(
          `Model ${model.modelId} does not support streaming`
        );
      }
    }

    // Validate input modalities if required
    if (requiredCapabilities.inputModalities) {
      for (const modality of requiredCapabilities.inputModalities) {
        if (!model.inputModalities.includes(modality)) {
          throw new ModelValidationError(
            `Model ${model.modelId} does not support ${modality} input`
          );
        }
      }
    }

    // Validate output modalities if required
    if (requiredCapabilities.outputModalities) {
      for (const modality of requiredCapabilities.outputModalities) {
        if (!model.outputModalities.includes(modality)) {
          throw new ModelValidationError(
            `Model ${model.modelId} does not support ${modality} output`
          );
        }
      }
    }
  }

  public static getModelCapabilities(modelId: string): ModelCapabilities {
    const model = this.validateModel(modelId);
    
    return {
      maxTokens: 4000, // Default value, should be configured per model
      supportsStreaming: model.inferenceTypesSupported.includes('ON_DEMAND'),
      supportsFunctionCalling: false, // Bedrock doesn't support function calling yet
      supportedMessageTypes: ['text'],
      apiVersion: 'bedrock-2023-05-31',
      vendor: model.providerName,
      modelId: model.modelId,
      inferenceTypes: model.inferenceTypesSupported,
      inputModalities: model.inputModalities,
      outputModalities: model.outputModalities
    };
  }
} 