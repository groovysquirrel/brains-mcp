# LLM Gateway V2

A flexible and extensible LLM Gateway implementation supporting multiple providers, vendors, and modalities.

## Current State

### Working Features
- Streaming responses with Claude models via Bedrock
- Advanced model configuration and provider setup
- Vendor adapter pattern implementation with Anthropic and Meta support
- Configuration-driven model management
- Model status tracking and availability management
- Intelligent error handling with model suggestions
- Conversation management with history tracking
- Metrics collection and logging
- Caching for improved performance

### Known Issues
- Llama streaming implementation needs fixing (conversation loops)
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
- Conversation management with history storage
- Metrics collection and logging
- Caching for improved Lambda reuse in serverless environments

## Structure

```
llm-gateway-v2/
├── src/
│   ├── Gateway.ts           # Main gateway implementation
│   ├── core/                # Core components
│   │   ├── GatewayManager.ts         # Manages gateway operations
│   │   ├── ConversationManager.ts    # Handles conversation state
│   │   ├── MetricsManager.ts         # Manages metrics collection
│   │   ├── RequestProcessor.ts       # Processes and validates requests
│   │   ├── providers/       # Provider implementations
│   │   │   ├── AbstractProvider.ts
│   │   │   └── BedrockProvider.ts
│   │   ├── vendors/         # Vendor-specific handling
│   │   │   ├── AbstractVendor.ts
│   │   │   ├── AnthropicVendor.ts
│   │   │   └── MetaVendor.ts
│   │   └── modalities/      # Modality implementations
│   │       ├── AbstractModalityHandler.ts
│   │       └── TextModalityHandler.ts
│   ├── repositories/        # Data access layer
│   │   ├── config/          # Configuration repositories
│   │   └── conversation/    # Conversation storage repositories
│   ├── utils/               # Utilities and helpers
│   └── types/               # Type definitions
└── config/                  # Configuration files
    ├── README.md            # Configuration documentation
    ├── providers.json       # Provider index
    ├── system/              # System configuration
    ├── providers/           # Provider-specific configs
    │   └── bedrock/
    │       ├── models.json
    │       └── settings.json
    ├── vendors/             # Vendor configurations
    └── modalities/          # Modality definitions
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

### Conversation Management

The gateway includes robust conversation management:
- Save and retrieve conversation history
- Continue existing conversations
- Delete conversations
- List user conversations
- Add messages to existing conversations

### Metrics Collection

Built-in metrics collection for tracking usage and performance:
- Token usage tracking
- Request duration metrics
- Success/failure rates
- Model usage statistics

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

// Create a new conversation
const { conversationId } = await gateway.createConversation({
  userId: 'user123',
  title: 'My Conversation'
});

// Chat within a conversation context
const conversationResponse = await gateway.conversationChat({
  provider: 'bedrock',
  modelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  messages: [
    { role: 'user', content: 'Hello, how are you?' }
  ],
  userId: 'user123',
  conversationId
});
```

## Next Steps

### 1. Core Functionality
- [ ] Add support for Azure and OpenAI providers
- [ ] Add support for text-to-image modality
- [ ] Add embeddings API support

### 2. Infrastructure
- [ ] Implement secrets and parameter store in SST
- [ ] Add support for Azure and OpenAI API keys
- [ ] Add model quotas and rate limiting
- [ ] Implement monitoring dashboards

### 3. User Tracking & Analytics
- [ ] Enhance metrics collection
- [ ] Add API usage quotas by user
- [ ] Implement cost tracking per model
- [ ] Add admin panel for usage monitoring

## License

MIT 