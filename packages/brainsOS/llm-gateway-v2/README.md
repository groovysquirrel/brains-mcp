# LLM Gateway V2

A flexible and extensible LLM Gateway implementation supporting multiple providers, vendors, and modalities.

## Current State

### Working Features
- Streaming responses with Claude models via Bedrock
- Basic model configuration and provider setup
- Initial vendor adapter pattern implementation
- Configuration-driven model management
- Model status tracking and availability management
- Intelligent error handling with model suggestions

### Known Issues
- Llama streaming implementation needs fixing (conversation loops)
- Need to distinguish between prompt and chat modes
- Limited provider implementations (only Bedrock)

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
│   │   └── BedrockProvider.ts
│   ├── vendors/          # Vendor-specific handling
│   │   ├── AbstractVendor.ts
│   │   ├── AnthropicVendor.ts
│   │   └── MetaVendor.ts
│   ├── modalities/       # Modality implementations
│   │   └── TextModalityHandler.ts
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
  "capabilities": {
    "modalities": ["text-to-text"],
    "streaming": true,
    "inputTypes": ["text"],
    "outputTypes": ["text"]
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

### Streaming Support

The gateway supports streaming responses with different implementations per vendor:

1. **Anthropic (Claude)**:
   - Uses `content_block_delta` events
   - Each chunk contains only new content
   - Final chunk includes usage statistics

2. **Meta (Llama)**:
   - Uses `generation` field for streaming
   - Each chunk may contain full conversation history
   - Requires careful content extraction

### Intelligent Error Handling

When a model is unavailable, the gateway suggests alternatives:
- First tries alternatives from the same vendor
- Falls back to other vendors on the same provider
- Includes helpful model information in suggestions

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

## Next Steps

### 1. Core Functionality
- [ ] Implement prompt vs chat mode distinction
- [ ] Fix Llama streaming implementation
- [ ] Add Nova model support with new vendor adapter
- [ ] Test and validate vendor adapter pattern

### 2. Infrastructure
- [ ] Implement secrets and parameter store in SST
- [ ] Add support for Azure and OpenAI API keys
- [ ] Implement additional providers (beyond Bedrock)
- [ ] Test and validate provider pattern

### 3. User Tracking & Analytics
- [ ] Add username tracking in websocket handler
- [ ] Implement parallel API handler
- [ ] Add support for API gateway tags
- [ ] Implement RDS storage for token usage data

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