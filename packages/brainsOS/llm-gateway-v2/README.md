# LLM Gateway V2

A flexible and extensible LLM Gateway implementation supporting multiple providers, vendors, and modalities.

## Features

- Support for multiple LLM providers (Bedrock, Azure, OpenAI)
- Support for multiple vendors (Anthropic, Meta, etc.)
- Support for multiple modalities (text-to-text, text-to-image, etc.)
- Configuration-driven model management
- Model status tracking and availability management
- Intelligent error handling with model suggestions
- Streaming support
- Provisioned/On-demand model support
- Strong type safety
- Clear separation of provider, vendor, and model configurations

## Structure

```
llm-gateway-v2/
├── src/
│   ├── Gateway.ts         # Main gateway implementation
│   ├── providers/         # Provider implementations
│   ├── vendors/          # Vendor-specific handling
│   ├── modalities/       # Modality implementations
│   ├── utils/            # Utilities and helpers
│   └── types/            # Type definitions
└── config/               # Configuration files
    ├── providers.json    # Provider index
    ├── providers/        # Provider-specific configs
    │   └── bedrock/
    │       ├── models.json
    │       └── settings.json
    ├── vendors/          # Vendor configurations
    └── modalities/       # Modality definitions
```

## Configuration

The gateway uses a hierarchical configuration system with clear separation between providers, vendors, and models:

### Provider Settings (`config/providers/bedrock/settings.json`)
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
    }
  }
}
```

### Models Configuration (`config/providers/bedrock/models.json`)
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
  ]
}
```

### Vendor Configuration (`config/vendors/anthropic.json`)
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
    "systemPrompts": true
  }
}
```

## Key Features

### Model Status Management

Each model includes status information:
```json
"llmgateway": {
  "status": "READY" | "NOT READY",
  "billing": "ONDEMAND" | "provisioned",
  "provisioned": false
}
```

### Intelligent Error Handling

When a model is unavailable, the gateway suggests alternatives:
- First tries alternatives from the same vendor
- Falls back to other vendors on the same provider
- Includes helpful model information in suggestions

### Model Discovery

```typescript
// Get all ready models
const allReadyModels = await gateway.getReadyModels();

// Get ready models for specific provider
const bedrockModels = await gateway.getReadyModels('bedrock');

// Get ready models for specific vendor
const anthropicModels = await gateway.getReadyModels(undefined, 'anthropic');

// Get ready models for specific provider and vendor
const bedrockAnthropicModels = await gateway.getReadyModels('bedrock', 'anthropic');
```

## Usage

```typescript
import { Gateway } from '@brainsos/llm-gateway-v2';

const gateway = new Gateway();

// Initialize with local configuration
await gateway.initialize('local');

// Chat with a model
const response = await gateway.chat({
  provider: 'bedrock',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ]
});

// Stream chat responses
for await (const chunk of gateway.streamChat({
  provider: 'bedrock',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages: [
    { role: 'user', content: 'Tell me a story' }
  ]
})) {
  console.log(chunk);
}
```

## Development

1. Install dependencies:
   ```bash
   npm install
   ```

2. Build the project:
   ```bash
   npm run build
   ```

3. Run tests:
   ```bash
   npm test
   ```

4. Lint the code:
   ```bash
   npm run lint
   ```

## License

MIT 