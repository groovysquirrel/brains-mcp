# LLM Gateway V2 Configuration

This directory contains all configuration files for the LLM Gateway. The configuration is organized hierarchically with clear separation between providers, vendors, and models.

## Current Structure

```
config/
├── providers.json             # Index of enabled providers
├── providers/                 # Provider-specific configurations
│   └── bedrock/             # Example provider (Bedrock)
│       ├── models.json      # All models grouped by vendor
│       └── settings.json    # Provider settings and capabilities
├── vendors/                  # Vendor-specific configurations
│   ├── anthropic.json
│   ├── amazon.json
│   ├── meta.json
│   └── ...
└── modalities/              # Modality-specific configurations
    ├── text-to-text.json
    ├── text-to-image.json
    └── ...
```

## File Types

1. **Provider Settings** (`providers/bedrock/settings.json`)
   - Contains provider-wide settings
   - Authentication and region configuration
   - Lists supported vendors
   - Defines provider-specific capabilities
   - Default parameters and limits

2. **Models Configuration** (`providers/bedrock/models.json`)
   - Complete list of models organized by vendor
   - Model capabilities and limitations
   - Inference type support
   - Gateway status information
   - Billing and provisioning status

3. **Vendor Configuration** (`vendors/*.json`)
   - Vendor-specific settings and capabilities
   - API formats and requirements
   - Authentication methods
   - Response handling configuration

## Configuration Format

### Provider Settings
```json
{
  "name": "bedrock",
  "type": "bedrock",
  "displayName": "AWS Bedrock",
  "region": "us-east-1",
  "capabilities": {
    "streaming": true,
    "inferenceTypes": {
      "onDemand": true,
      "provisioned": false
    },
    "modalities": [
      "text-to-text",
      "text-to-image",
      "embedding"
    ]
  },
  "defaultSettings": {
    "maxTokens": 1024,
    "temperature": 0.7
  }
}
```

### Models Configuration
```json
{
  "vendors": [
    {
      "name": "anthropic",
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
              "provisioned": false
            }
          },
          "llmgateway": {
            "status": "READY",
            "billing": "ONDEMAND",
            "provisioned": false
          }
        }
      ]
    }
  ],
  "lastUpdated": "2024-04-04T15:42:11.304Z"
}
```

### Vendor Configuration
```json
{
  "name": "anthropic",
  "displayName": "Anthropic",
  "apiFormats": {
    "messages": true,
    "prompt": false
  },
  "capabilities": {
    "streaming": true,
    "systemPrompts": true,
    "tools": true
  },
  "responseFormat": {
    "type": "messages",
    "contentField": "content"
  }
}
```

## Model Status and Availability

Models in the gateway have explicit status tracking:

```json
"llmgateway": {
  "status": "READY" | "NOT READY",
  "billing": "ONDEMAND" | "provisioned",
  "provisioned": false
}
```

- `status`: Indicates if the model is ready for use
- `billing`: Specifies the billing mode
- `provisioned`: Tracks provisioning status

## Maintenance

1. **Model Discovery**
   - Run the discovery script: `npm run discover`
   - Updates `models.json` with latest model information
   - Sets appropriate gateway status for each model

2. **Updating Configurations**
   - Provider settings in `providers/*/settings.json`
   - Model configurations in `providers/*/models.json`
   - Vendor-specific settings in `vendors/*.json`

3. **Adding New Providers**
   - Create new provider directory in `providers/`
   - Add provider settings
   - Run discovery for model configurations
   - Configure vendor settings if needed

## Notes

- All model configurations are consolidated in `models.json` per provider
- Models are organized by vendor for better structure
- Gateway status tracking helps prevent usage of unavailable models
- Clear separation between provider settings and model configurations
- Vendor configurations focus on API and response handling 