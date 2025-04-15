# Brain Controller Module

The Brain Controller module manages brain configurations and operations in the BRAINS system. It provides a centralized way to handle different brain configurations, process requests, and manage conversation state.

## Architecture

The module follows a layered architecture with clear separation of concerns:

```
brain-controller/
├── src/
│   ├── repositories/
│   │   └── brains/
│   │       ├── BrainsRepository.ts      # Main repository implementation
│   │       ├── LocalLoader.ts           # Local configuration loader
│   │       └── DynamoDBLoader.ts        # DynamoDB loader (placeholder)
│   ├── types/
│   │   ├── BrainConfig.ts              # Brain configuration types
│   │   ├── BrainRequest.ts             # Request types and validation
│   │   └── BrainResponse.ts            # Response types and helpers
│   ├── utils/
│   │   └── logging/
│   │       └── Logger.ts               # Logging utilities
│   └── BrainController.ts              # Main controller implementation
└── config/
    └── defaults.json                   # Default brain configurations
```

## Components

### BrainController

The main controller class that:
- Manages brain configurations
- Processes requests
- Maintains conversation state
- Handles errors

```typescript
interface BrainController {
    initialize(): Promise<void>;
    getBrain(name: string): Promise<BrainConfig>;
    processRequest(request: BrainRequest): Promise<BrainResponse>;
    handleError(error: Error): BrainResponse;
}
```

### BrainsRepository

Manages brain configurations with:
- In-memory storage
- Local file system loading
- Future DynamoDB support
- Singleton pattern

```typescript
interface IBrainsRepository {
    initialize(): Promise<void>;
    getBrain(name: string): Promise<BrainConfig>;
    getAllBrains(): Promise<BrainConfig[]>;
    hasBrain(name: string): Promise<boolean>;
    setBrain(brain: BrainConfig): Promise<void>;
    removeBrain(name: string): Promise<boolean>;
}
```

### Types

#### BrainConfig
```typescript
interface BrainConfig {
    name: string;
    config: {
        modelId: string;
        provider: string;
        nickname: string;
        systemPrompt: string;
        persona: string;
    };
}
```

#### BrainRequest
```typescript
interface BrainRequest {
    action: string;
    data: {
        provider?: string;
        modelId?: string;
        conversationId?: string;
        messages?: Array<{
            role: string;
            content: string;
        }>;
        [key: string]: any;
    };
}
```

#### BrainResponse
```typescript
interface BrainResponse {
    type: 'terminal' | 'error' | 'processing';
    data: {
        content?: string;
        source?: string;
        timestamp?: string;
        commandId?: string;
        message?: string;
    };
}
```

## Usage

### Initialization
```typescript
const brainController = BrainController.getInstance();
await brainController.initialize();
```

### Processing Requests
```typescript
const request: BrainRequest = {
    action: 'brain/chat',
    data: {
        connectionId: 'conn_123',
        brainName: 'default',
        messages: [{
            role: 'user',
            content: 'Hello'
        }]
    }
};

const response = await brainController.processRequest(request);
```

### WebSocket Handler
The module is integrated with a WebSocket handler that:
- Validates incoming requests
- Converts non-brain requests to chat format
- Maintains conversation state
- Handles errors gracefully

## Configuration

Brain configurations are stored in `config/defaults.json` with the following structure:
```json
{
    "brains": [
        {
            "name": "default",
            "config": {
                "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
                "provider": "bedrock",
                "nickname": "smith",
                "systemPrompt": "You are a helpful AI assistant.",
                "persona": "A helpful and knowledgeable AI assistant."
            }
        }
    ]
}
```

## Future Enhancements

1. DynamoDB Integration
   - Implement DynamoDBLoader for persistent storage
   - Add configuration for DynamoDB table names
   - Implement backup/restore functionality

2. Enhanced Brain Types
   - Add support for different brain modalities
   - Implement brain-specific validation rules
   - Add support for brain versioning

3. Monitoring and Metrics
   - Add performance metrics collection
   - Implement health checks
   - Add usage statistics

4. Security
   - Add authentication for brain operations
   - Implement access control
   - Add encryption for sensitive configurations
