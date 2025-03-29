# Prompt Service

## Overview
The Prompt Service is a Lambda-based API that handles various types of AI model interactions, including single-turn instructions and multi-turn conversations. It's designed to be modular, extensible, and type-safe.

## Architecture

### Core Components

1. **Prompt Handler (`promptHandler.tsx`)**
   - Main entry point for all prompt-related requests
   - Routes requests to appropriate sub-handlers based on prompt type
   - Handles global error management and response formatting
   - Supports: instruction, conversation, and chat modes

2. **Conversation Handler (`conversation/conversationHandler.tsx`)**
   - Manages stateful conversations with AI models
   - Maintains conversation history
   - Handles context management and prompt formatting
   - Integrates with Bedrock for model interactions

3. **Instruction Handler (`instruction/instructionHandler.tsx`)**
   - Handles single-turn interactions
   - Optimized for stateless operations
   - Supports direct model invocation

4. **Repository Layer**
   - **Base Repository (`baseRepository.ts`)**
     - Abstract base class for all repositories
     - Handles DynamoDB interactions
     - Provides consistent data access patterns
   
   - **Conversation Repository (`conversationRepository.ts`)**
     - Manages conversation storage and retrieval
     - Uses DynamoDB with composite keys
     - Follows singleton pattern for instance management

### Data Storage

#### DynamoDB Schema

1. **User Data Table**
   - Primary Key: 
     - `userId` (Partition Key)
     - `typeName` (Sort Key)
   
   - Key Format:
     ```
     userId: "<user-identifier>"
     typeName: "transactions#conversation#<conversation-id>"
     ```

   - Data Structure:
     ```json
     {
       "userId": "user123",
       "typeName": "transactions#conversation#conv123",
       "data": {
         "messages": [
           {
             "role": "user",
             "content": "Hello!",
             "timestamp": "2024-01-01T00:00:00.000Z"
           },
           {
             "role": "assistant",
             "content": "Hi there!",
             "timestamp": "2024-01-01T00:00:00.000Z"
           }
         ],
         "metadata": {
           "createdAt": "2024-01-01T00:00:00.000Z",
           "updatedAt": "2024-01-01T00:00:00.000Z"
         }
       }
     }
     ```

2. **System Data Table**
   - Similar structure to User Data Table
   - Used for system-level data storage
   - Restricted access via IAM policies

### Design Patterns

1. **Repository Pattern**
   - Conversation history management via `conversationRepository`
   - Abstracts database operations
   - Enables easy testing and switching of storage implementations

2. **Service Layer Pattern**
   - Clear separation between API handlers and business logic
   - Modular design for different prompt types
   - Consistent error handling and response formatting

3. **Type-Safe Implementation**
   - Comprehensive TypeScript interfaces
   - Runtime type validation
   - AWS Lambda type integration

## API Endpoints

### Conversation API

#### POST /prompt/conversation
Creates or continues a conversation with an AI model.

Request:
```json
{
"userPrompt": "string",
"modelId": "string",
"modelSource": "string",
"conversationId": "string"
}
```

Response:
```json
{
"success": true,
"data": {
"response": "string",
"conversationId": "string"
},
"metadata": {
"requestId": "string",
"processingTimeMs": number,
    "timestamp": "string"
    }
}
```

### Error Handling
- Standardized error responses
- Detailed error codes and messages
- Proper HTTP status codes

## Testing

### Unit Tests
- Comprehensive test suite for each handler
- Mocked dependencies for isolated testing
- Coverage for success and error cases

### Integration Tests
- End-to-end API testing
- Real database interactions
- Model invocation testing

## Example Usage

### CLI Testing

#### 1. Start New Conversation
```bash
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='xxxxxx' \
--path-template='/latest/services/prompt/conversation' \
--method='POST' \
--body='{
  "userPrompt": "Tell me a joke about programming",
  "modelId": "anthropic.claude-v2",
  "modelSource": "bedrock",
  "conversationId": "test-convo-123"
}'
```

#### 2. Continue Conversation
```bash
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='xxxxxx' \
--path-template='/latest/services/prompt/conversation' \
--method='POST' \
--body='{
  "userPrompt": "That was funny! Tell me another one",
  "modelId": "anthropic.claude-v2",
  "modelSource": "bedrock",
  "conversationId": "test-convo-123"
}'
```

#### 3. Get Conversation History
```bash
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='xxxxxx' \
--path-template='/latest/services/prompt/conversation/test-convo-123' \
--method='GET'
```

#### 4. Test Error Cases

##### Missing Required Fields
```bash
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='xxxxxx' \
--path-template='/latest/services/prompt/conversation' \
--method='POST' \
--body='{
  "userPrompt": "Tell me a joke",
  "modelSource": "bedrock"
}'
```

##### Invalid Model ID
```bash
npx aws-api-gateway-cli-test \
--user-pool-id='us-east-1_ILoc6G1pf' \
--app-client-id='17h3pq2ua0p28akm05sde9ttnt' \
--cognito-region='us-east-1' \
--identity-pool-id='us-east-1:ab1ed509-bcc9-486d-9d7a-52f8be8c87d1' \
--invoke-url='https://dev-api.brains.patternsatscale.com' \
--api-gateway-region='us-east-1' \
--username='justin_dev@patternsatscale.com' \
--password='xxxxxx' \
--path-template='/latest/services/prompt/conversation' \
--method='POST' \
--body='{
  "userPrompt": "Tell me a joke",
  "modelId": "invalid-model",
  "modelSource": "bedrock",
  "conversationId": "test-convo-123"
}'
```

### Expected Responses

#### Success Response
```json
{
  "success": true,
  "data": {
    "response": "Here's a programming joke: Why do programmers prefer dark mode? Because light attracts bugs!",
    "conversationId": "test-convo-123"
  },
  "metadata": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "processingTimeMs": 1234,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

#### Error Response
```json
{
  "success": false,
  "error": {
    "code": "MISSING_PAYLOAD",
    "message": "Missing required fields",
    "details": {
      "service": "conversation",
      "statusCode": 400
    }
  },
  "metadata": {
    "requestId": "123e4567-e89b-12d3-a456-426614174000",
    "processingTimeMs": 123,
    "timestamp": "2024-01-01T00:00:00.000Z"
  }
}
```

## Implementation Details

### Repository Pattern Implementation

1. **Base Repository**
   ```typescript
   abstract class baseRepository<T> {
     protected abstract typeName: string;
     protected abstract namespace: string;
     protected abstract tableName: string;
     
     protected async getData(userId: string, id: string): Promise<T | null>;
     protected async setData(userId: string, id: string, data: T): Promise<void>;
     
     abstract get(userId: string, id: string): Promise<T | null>;
     abstract set(userId: string, id: string, data: T): Promise<void>;
   }
   ```

2. **Conversation Repository**
   ```typescript
   class ConversationRepository extends baseRepository<ConversationData> {
     protected namespace = 'conversation';
     protected typeName = 'transactions';
     protected tableName: string;

     // Implements singleton pattern
     static getInstance(storageType: 'user' | 'system' = 'user'): ConversationRepository;
   }
   ```

### IAM Requirements

The Lambda function requires the following DynamoDB permissions:
```json
{
  "Effect": "Allow",
  "Action": [
    "dynamodb:GetItem",
    "dynamodb:PutItem",
    "dynamodb:UpdateItem"
  ],
  "Resource": [
    "arn:aws:dynamodb:${AWS::Region}:${AWS::AccountId}:table/${self:custom.userDataTable}"
  ]
}
```

## Future Improvements
1. Add support for streaming responses
2. Implement conversation summarization
3. Add conversation metadata (tags, titles)
4. Enhance history management (pagination, filtering)
5. Add support for more model providers

## Troubleshooting

### Common Issues

1. **DynamoDB Access Errors**
   - Check IAM role permissions
   - Verify table names in environment variables
   - Ensure correct key format: `transactions#conversation#<id>`

2. **Data Not Found**
   - Verify correct userId is being passed
   - Check typeName format matches expected pattern
   - Confirm data was properly saved in previous operations

3. **Type Errors**
   - Ensure all required fields are present in requests
   - Verify message format matches expected schema
   - Check that role is either 'user' or 'assistant'