# BrainsOS: A Serverless Operating System for AI Systems and Sub-Minds

The Balanced Reasoning AI Node Structure Operating System (BRAINSOS) is a serverless operating system designed to manage Large Language Models (LLMs) and specialized AI subminds (agents) with a common command system and a shared operating template.

## Key Principles
- All models are wrong, but some are useful. Each implementation must justify its utility.
- Value lies in data and user-generated models, not the underlying technology.
- Users retain full ownership and control of their data.
- LLMs are treated as non-deterministic engines with short-term memory characteristics.
- BrainsOS provides structured long-term memory and state management.
- Human-in-the-loop supervision remains central to all operations.
- Comprehensive audit trails for all system activities.

# BrainsOS Project Structure

brains/
├── sst.config.ts              # SST configuration
├── infra/                     # Infrastructure code
│   ├── auth.ts               # Authentication setup
│   ├── api.ts                # API Gateway configuration
│   └── frontends.ts          # Frontend deployments
│
├── packages/
│   ├── frontend/             # Frontend application
│   │   └── src/
│   │       └── components/
│   │           └── terminal/
│   │               ├── CommandExecutor.ts
│   │               └── Terminal.tsx
│   │
│   └── brainsOS/            # Core backend
│       ├── commands/        # Command implementations
│       │   ├── test/
│       │   ├── load/
│       │   ├── show/
│       │   └── prompt/
│       │
│       ├── config/          # Core submind configurations
│       ├── core/
│       │   └── services/
│       │       └── bedrock/
│       │       └── dynamodb/
│       │
│       │   └── repositories/
│       │       └── conversations/conversationRepository.ts
│       │       └── models/modelRepository.ts
│       │       └── subminds/submindRepository.ts
│       │       └── users/userRepository.ts
│       │
│       │   └── types/
│       │       └── api/
│       │           └── commandTypes.ts
│       │           └── responseTypes.ts
│       │       └── baseTypes.ts
│       │       └── promptTypes.ts
│       │       └── userTypes.ts
│       │
│       └── data/            # Data handling
│           └── defaults/    # Default configurations
│               └── defaultSystemSettings.json  
│       │
│       └── docs/            # Documentation
│       │
│       ├── functions/       # API Function definitions
│       │   └── shared/
│       │       └── auth/
│       │           └── validateUser.ts
│       │       └── logging/
│       │           └── requestLogger.ts
│       │   └── api/
│       │       └── command/ 
│       │           └── commandHandler.ts
│       │           └── commandExecutor.ts
│       │       └── direct/
│       │           └── chat/
│       │               └── chatHandler.ts
│       │           └── complete/
│       │               └── completeHandler.ts
│       │
│       └── utils/           # Shared utilities
│           └── parser/
│               └── commandNormalizer.ts
│               └── commandParser.ts
│           └── response.ts
│           └── logger.ts


## Core Services (/packages/brainsOS/core/services/)
### Bedrock Integration
- bedrockClient.ts - AWS Bedrock service integration
  - Connection testing
  - Model listing and filtering
  - Error handling with BedrockServiceError


## Command System (/packages/brainsOS/commands/)
### Base Commands
- test/
  - testCommand.ts - Connection testing implementation
  - testCommandTypes.ts - Type definitions
  - __tests__/testCommand.test.ts - Test coverage
- load/
  - loadCommand.ts - Model loading functionality
  - __tests__/loadCommand.test.ts - Load command testing
- show/
  - showCommand.ts - System information display
  - __tests__/showCommand.test.ts - Show command testing
- prompt/
  - promptCommand.ts - LLM interaction handling
  - __tests__/promptCommand.test.ts - Prompt testing

### Command Processing
- parser/
  - commandParser.ts - Command string parsing
  - parameterParser.ts - Parameter extraction
  - flagParser.ts - Flag handling
- executor/
  - commandExecutor.ts - Command routing and execution
  - responseHandler.ts - Response formatting

## Frontend Integration (/packages/frontend/)
### Terminal Interface
- components/terminal/
  - CommandExecutor.ts - Frontend command handling
  - Terminal.tsx - xterm.js integration
  - TerminalOutput.tsx - Response display
  - HistoryManager.ts - Command history

### Authentication
- auth/
  - cognito.ts - AWS Cognito integration
  - userContext.ts - User session management

## Shared Utilities (/packages/brainsOS/utils/)
- response.ts - Standard response formatting
- logging.ts - Centralized logging
- validation.ts - Input validation
- error/
  - errorTypes.ts - Custom error definitions
  - errorHandler.ts - Error processing

## Documentation (/packages/brainsOS/docs/)
- README.md - Project overview and principles (this file)

### Key Test Files
- commands/test/__tests__/testCommand.test.ts
- commands/load/__tests__/loadCommand.test.ts
- core/services/bedrock/__tests__/bedrockClient.test.ts

## Configuration
- infra/
  - config.ts - Deployment configuration management
- types/
  - commandTypes.ts - Command interfaces
  - responseTypes.ts - Response structures
  - userTypes.ts - User context types

## State Management
- state/
  - StateManager.ts - Centralized state handling
  - persistence.ts - Local storage integration
  - preferences.ts - User preferences

## API Integration
- api/
  - endpoints.ts - API route definitions
  - middleware/
    - auth.ts - Authentication middleware
    - validation.ts - Request validation
    - error.ts - Error handling middleware





### Core Commands
#### System Management:
- test connection [service=bedrock]
- load llm [source=bedrock]
- list llms [source=<provider>]
- deploy submind
- show config

#### AI Operations:
- prompt <model> <text>
- remember (persistent storage)
- recall (data retrieval)
- propose (suggestion generation)

## Security & Authentication
- AWS Cognito integration for user authentication
- IAM-based permission management
- Typed user contexts with validation
- Secure command execution pipeline

## Testing Philosophy
Our testing approach follows these patterns:
```typescript
  it('should handle basic connection test', async () => {
    const command: TestCommandRequest = {
      action: 'test',
      object: 'connection',
      parameters: [],
      flags: {},
      raw: 'test connection',
      user: testUser
    };
    };
    const result = await handleTestCommand(command) as AwsApiResponse;
    expect(result.statusCode).toBe(200);
    expect(JSON.parse(result.body).success).toBe(true);
  });
  });
  it('should handle bedrock connection test successfully', async () => {
    (testConnection as jest.Mock).mockResolvedValue(true);
    (testConnection as jest.Mock).mockResolvedValue(true);
    const command: TestCommandRequest = {
      action: 'test',
      object: 'connection',
      parameters: ['service=bedrock'],
      flags: {},
      raw: 'test connection service=bedrock',
      user: testUser
    };
    };
    const result = await handleTestCommand(command) as AwsApiResponse;
    const body = JSON.parse(result.body);
    const body = JSON.parse(result.body);
    expect(result.statusCode).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.service).toBe('bedrock');
    expect(testConnection).toHaveBeenCalled();
  });
```
### Testing Principles
- Comprehensive command testing
- Mock service integrations
- Error handling verification
- User context validation
- Response format validation

## Error Handling
The system implements a robust error handling strategy:
- Typed error responses
- Service-specific error types (e.g., BedrockServiceError)
- Consistent error formatting
- Detailed error logging
- User-friendly error messages

## Response Format
All commands return a standardized response structure:
```typescript
        return createResponse(200, {
          success: true,
          data: {
            message: "Bedrock connection successful",
            service: "bedrock",
            userId,
            timestamp: new Date().toISOString()
          }
        });
```

## Development Guidelines
- Strong TypeScript typing throughout
- Command pattern implementation
- Service abstraction layers
- Comprehensive testing coverage
- Consistent error handling
- Detailed logging at all levels

## Future Roadmap
- Enhanced state management
- Expanded service integrations
- Advanced prompt routing
- Improved conversation history
- Extended model support
- Advanced templating system
- Configuration Management
- Configurations are versioned, typed, and maintain state. All changes are tracked and audited.
