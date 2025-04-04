import { ConfigManager } from '../src/config';
import * as fs from 'fs/promises';
import * as path from 'path';
import { InferenceTypes } from '../src/types/ModelConfig';

interface VendorModel {
    modelId: string;
    provider: string;
    vendor: string;
    modality: string;
    maxTokens?: number;
    temperature?: number;
    capabilities: {
        streaming: boolean;
        inferenceTypes: InferenceTypes;
    };
}

interface VendorConfig {
    name: string;
    models: VendorModel[];
}

interface ProviderConfig {
    name: string;
    type: string;
    vendorConfigs: {
        [key: string]: {
            models: VendorModel[];
        };
    };
}

async function main() {
    const configManager = ConfigManager.getInstance();
    const models = await configManager.discoverAndUpdateModels();
    
    // Create the proper registry structure
    const configPath = path.join(__dirname, '../config');
    
    // Create providers config
    const providersConfig: ProviderConfig = {
        name: 'bedrock',
        type: 'bedrock',
        vendorConfigs: {}
    };
    
    // Group models by vendor
    const vendors = new Map<string, VendorConfig>();
    const vendorModels = new Map<string, VendorModel[]>();
    
    for (const model of models) {
        if (!vendors.has(model.vendor)) {
            vendors.set(model.vendor, {
                name: model.vendor,
                models: []
            });
            vendorModels.set(model.vendor, []);
        }
        
        // Add model to vendor's list
        vendorModels.get(model.vendor)!.push({
            modelId: model.modelId,
            provider: model.provider,
            vendor: model.vendor,
            modality: model.modality,
            capabilities: {
                streaming: model.capabilities.streaming,
                inferenceTypes: model.capabilities.inferenceTypes
            }
        });
    }
    
    // Create vendor configs
    for (const [vendorName, vendorConfig] of vendors) {
        vendorConfig.models = vendorModels.get(vendorName)!;
        providersConfig.vendorConfigs[vendorName] = {
            models: vendorModels.get(vendorName)!
        };
    }
    
    // Write provider config
    await fs.writeFile(
        path.join(configPath, 'providers', 'bedrock.json'),
        JSON.stringify(providersConfig, null, 2)
    );
    
    // Write vendor configs
    for (const [vendorName, vendorConfig] of vendors) {
        await fs.writeFile(
            path.join(configPath, 'vendors', `${vendorName}.json`),
            JSON.stringify(vendorConfig, null, 2)
        );
    }
    
    // Write individual model configs
    for (const model of models) {
        const modelConfig = {
            modelId: model.modelId,
            provider: model.provider,
            vendor: model.vendor,
            modality: model.modality,
            capabilities: {
                streaming: model.capabilities.streaming,
                inferenceTypes: model.capabilities.inferenceTypes
            }
        };
        
        await fs.writeFile(
            path.join(configPath, 'models', `${model.modelId}.json`),
            JSON.stringify(modelConfig, null, 2)
        );
    }
    
    console.log('Discovery completed and registry structure created');
}

main().catch(error => {
    console.error('Discovery failed:', error);
    process.exit(1);
}); 