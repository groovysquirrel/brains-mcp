# LLM Gateway Service

A unified gateway service for interacting with various LLM providers (AWS Bedrock, OpenAI, Anthropic) using LangChain.js.

## Features

- Unified interface for multiple LLM providers
- Automatic handling of model-specific message formats
- Support for streaming responses
- Built-in error handling and retries
- TypeScript support
- AWS Lambda integration

## API Endpoints

### POST /chat

Send a chat request to the LLM gateway.

```typescript
interface ChatRequest {
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  modelId: string;
  provider: 'bedrock' | 'openai' | 'anthropic';
  systemPrompt?: string;
  metadata?: Record<string, any>;
}
```

Example request:
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Tell me a joke"
    }
  ],
  "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
  "provider": "bedrock",
  "systemPrompt": "You are a helpful assistant."
}
```

### Streaming Support

Add `?stream=true` to the URL to enable streaming responses.

## Configuration

The service is configured through environment variables:

```env
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
OPENAI_API_KEY=your_openai_key  # Optional
ANTHROPIC_API_KEY=your_anthropic_key  # Optional
```

## Usage Example

```typescript
import { LLMGateway } from './llmGateway';
import { HumanMessage, SystemMessage } from "@langchain/core/messages";

const gateway = new LLMGateway({
  bedrock: {
    region: "us-east-1",
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    }
  }
});

const response = await gateway.chat({
  messages: [
    new SystemMessage("You are a helpful assistant."),
    new HumanMessage("Tell me a joke")
  ],
  modelConfig: {
    provider: "bedrock",
    modelId: "anthropic.claude-3-sonnet-20240229-v1:0",
    temperature: 0.7
  }
});

console.log(response.content);
```

## Error Handling

The service includes built-in error handling for:
- Rate limiting
- Invalid requests
- Provider-specific errors
- Network issues

All errors are logged with appropriate context and returned in a consistent format:

```typescript
interface ErrorResponse {
  success: false;
  error: string;
  metadata: {
    requestId: string;
    timestamp: string;
  }
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