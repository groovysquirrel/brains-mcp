import { ModelConfig } from '../../types/ModelConfig';
import { Logger } from '../../utils/logging/Logger';
import { BedrockClient, ListFoundationModelsCommand } from '@aws-sdk/client-bedrock';

/**
 * Handles discovery of available models from AWS Bedrock
 */
export class BedrockDiscovery {
    private bedrock: BedrockClient;
    private logger: Logger;

    constructor() {
        this.logger = new Logger('BedrockDiscovery');
        this.bedrock = new BedrockClient({});
    }

    /**
     * Discovers available models from Bedrock
     */
    public async discoverModels(): Promise<ModelConfig[]> {
        try {
            const command = new ListFoundationModelsCommand({});
            const response = await this.bedrock.send(command);
            
            return response.modelSummaries?.map(model => 
                this.formatModelConfig(
                    model,
                    'bedrock',
                    model.providerName?.toLowerCase() || 'unknown'
                )
            ) || [];
        } catch (error) {
            this.logger.error('Failed to discover Bedrock models:', error);
            throw error;
        }
    }

    /**
     * Formats a raw Bedrock model into our ModelConfig format
     */
    private formatModelConfig(
        rawModel: any,
        provider: string,
        vendor: string
    ): ModelConfig {
        return {
            modelId: rawModel.modelId || '',
            provider,
            vendor,
            modality: this.determineModality(rawModel),
            capabilities: {
                streaming: this.determineStreamingSupport(rawModel),
                inferenceTypes: this.determineInferenceTypes(rawModel)
            }
        };
    }

    /**
     * Determines the modality of a model based on its input/output capabilities
     */
    private determineModality(rawModel: any): string {
        const inputModalities = rawModel.inputModalities || [];
        const outputModalities = rawModel.outputModalities || [];

        if (inputModalities.includes('TEXT') && outputModalities.includes('TEXT')) {
            return 'text-to-text';
        }
        if (inputModalities.includes('TEXT') && outputModalities.includes('IMAGE')) {
            return 'text-to-image';
        }
        if (inputModalities.includes('IMAGE') && outputModalities.includes('TEXT')) {
            return 'image-to-text';
        }

        return 'unknown';
    }

    /**
     * Determines if a model supports streaming
     */
    private determineStreamingSupport(rawModel: any): boolean {
        const inferenceTypes = rawModel.inferenceTypesSupported || [];
        return inferenceTypes.includes('STREAMING');
    }

    /**
     * Determines the supported inference types for a model
     */
    private determineInferenceTypes(rawModel: any): {
        onDemand: boolean;
        provisioned: boolean;
        streaming: boolean;
    } {
        const inferenceTypes = rawModel.inferenceTypesSupported || [];
        return {
            onDemand: inferenceTypes.includes('ON_DEMAND'),
            provisioned: inferenceTypes.includes('PROVISIONED'),
            streaming: inferenceTypes.includes('STREAMING')
        };
    }
} 