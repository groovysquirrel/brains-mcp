# LLM Gateway V2 Configuration

This directory contains all configuration files for the LLM Gateway. The configuration is organized in a provider-centric way, with each provider having its own directory structure.

## Current Structure

```
config/
├── bedrock/                    # Bedrock-specific configurations
│   ├── models.json            # All Bedrock model configurations
│   ├── vendors/               # Vendor-specific configurations
│   │   ├── anthropic.json
│   │   ├── amazon.json
│   │   ├── meta.json
│   │   ├── cohere.json
│   │   ├── mistral.json
│   │   └── ...
│   └── provider.json          # Bedrock provider configuration
```

## File Types

1. **Provider Configuration** (`bedrock/provider.json`)
   - Contains provider-wide settings
   - Lists available vendors
   - Defines provider-specific capabilities

2. **Models Configuration** (`bedrock/models.json`)
   - Complete list of models from the provider
   - Individual model capabilities and limitations
   - Inference type support
   - Modality information

3. **Vendor Configuration** (`bedrock/vendors/*.json`)
   - Vendor-specific settings and capabilities
   - Organized list of supported models
   - Model grouping by modality/type
   - Vendor-specific capabilities and limitations

## Configuration Format

### Provider Configuration
```json
{
  "name": "bedrock",
  "type": "bedrock",
  "region": "us-east-1",
  "capabilities": {
    "streaming": true,
    "provisioning": true
  }
}
```

### Models Configuration
```json
{
  "models": [
    {
      "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
      "provider": "bedrock",
      "vendor": "anthropic",
      "modality": "text-to-text",
      "capabilities": {
        "streaming": true,
        "inferenceTypes": {
          "onDemand": true,
          "provisioned": false,
          "streaming": true
        }
      }
    }
  ],
  "lastUpdated": "2024-04-04T15:42:11.304Z"
}
```

### Vendor Configuration
```json
{
  "name": "amazon",
  "displayName": "Amazon",
  "models": {
    "text": [
      "titan-tg1-large",
      "titan-text-express-v1"
    ],
    "image": [
      "titan-image-generator-v1"
    ],
    "embedding": [
      "titan-embed-text-v1"
    ]
  },
  "capabilities": {
    "modalities": ["text-to-text", "text-to-image", "embedding"],
    "streaming": true,
    "provisioning": {
      "onDemand": true,
      "provisioned": true
    }
  }
}
```

## Maintenance

1. **Discovering Models**
   - Run the discovery script: `npm run discover`
   - This updates `models.json` with latest model information
   - Reviews and updates vendor configurations

2. **Updating Configurations**
   - Provider changes go in `provider.json`
   - Model updates are reflected in `models.json`
   - Vendor-specific changes in `vendors/*.json`

3. **Adding New Providers**
   - Create new provider directory
   - Add provider configuration
   - Add vendor configurations
   - Run discovery for model configurations

## Notes

- All provider-specific model information is in `bedrock/models.json`
- Vendor configurations provide a more organized view of available models
- Vendor files can group models by type/modality for easier access
- Provider configuration contains provider-wide settings and capabilities 