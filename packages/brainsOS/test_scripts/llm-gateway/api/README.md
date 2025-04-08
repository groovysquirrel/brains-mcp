# LLM Gateway API

This directory contains scripts for testing the LLM Gateway REST API.

## API Endpoints

The LLM Gateway exposes the following REST API endpoints:

### Prompt Endpoint
- **URL**: `/llm-gateway/prompt`
- **Method**: `POST`
- **Description**: Send a stateless prompt to the LLM (no conversation history is maintained)
- **Request Body Example**:
  ```json
  {
    "messages": [
      {"role": "user", "content": "tell me a joke"}
    ],
    "provider": "bedrock",
    "modelId": "anthropic.claude-3-sonnet-20240229-v1:0",
    "modality": "text",
    "systemPrompt": "talk like you are a pirate"
  }
  ```

### Conversation Endpoint
- **URL**: `/llm-gateway/conversation`
- **Method**: `POST`
- **Description**: Start or continue a conversation with the LLM (history is maintained)
- **Request Body Example** (new conversation):
  ```json
  {
    "messages": [
      {"role": "user", "content": "tell me a joke"}
    ],
    "provider": "bedrock",
    "modality": "text",
    "systemPrompt": "talk like you are a pirate",
    "title": "Pirate Jokes Conversation",
    "tags": ["pirate", "jokes", "demo"]
  }
  ```
- **Request Body Example** (continue conversation):
  ```json
  {
    "conversationId": "YOUR_CONVERSATION_ID",
    "messages": [
      {"role": "user", "content": "tell me another joke"}
    ],
    "provider": "bedrock",
    "modality": "text"
  }
  ```

### List Conversations Endpoint
- **URL**: `/llm-gateway/list-conversations`
- **Method**: `POST`
- **Description**: List all conversations for the current user
- **Request Body Example**:
  ```json
  {}
  ```

### Get Conversation Endpoint
- **URL**: `/llm-gateway/get-conversation`
- **Method**: `POST`
- **Description**: Get details of a specific conversation by ID
- **Request Body Example**:
  ```json
  {
    "conversationId": "YOUR_CONVERSATION_ID"
  }
  ```

### Delete Conversation Endpoint
- **URL**: `/llm-gateway/delete-conversation`
- **Method**: `POST`
- **Description**: Delete a specific conversation by ID
- **Request Body Example**:
  ```json
  {
    "conversationId": "YOUR_CONVERSATION_ID"
  }
  ```

## Authentication

The LLM Gateway API requires authentication. Two methods are supported:

1. **JWT Token Authentication**: 
   - Pass the Cognito ID token in the `Authorization` header
   - Format: `Authorization: Bearer YOUR_ID_TOKEN`
   - The user ID will be extracted from the token's `sub` claim

2. **Explicit User ID**:
   - For testing purposes, you can include a `userId` field in the request body
   - This is useful when authentication mechanisms vary

## Testing Script

The `api.test.sh` script helps you test all API endpoints automatically.

### Prerequisites

1. Make sure `.env.test` is properly configured with:
   - `APP_CLIENT_ID`: Cognito app client ID
   - `COGNITO_USERNAME`: Your Cognito username
   - `COGNITO_PASSWORD`: Your Cognito password
   - `COGNITO_REGION`: AWS region for Cognito
   - `API_BASE_URL`: Base URL for your API (or set as environment variable)

2. Required tools:
   - `curl`: For making HTTP requests
   - `jq`: For parsing JSON responses
   - `base64`: For decoding JWT tokens
   - AWS CLI: For authentication

### Usage

1. Configure the API URL:
   ```bash
   export API_BASE_URL="https://your-api-endpoint.com/latest/services"
   ```

2. Run the test script:
   ```bash
   ./api.test.sh
   ```

The script will:
1. Get authentication tokens from Cognito
2. Extract user information from the token
3. Test connectivity to the endpoint
4. Run all API endpoint tests sequentially
5. Automatically save conversation IDs for testing continuations
6. Display colored output for better readability

## Debugging Authentication Issues

If you encounter authentication issues:

1. The script extracts and displays the `sub` and `email` from your JWT token
2. Check that the token is valid and not expired
3. Verify the API Gateway configuration allows Bearer token authentication
4. Use the verbose test (`TEST 0`) to see the HTTP response headers
5. Make sure the user ID is being correctly extracted from the JWT token

## Notes

- The API does not support streaming responses (unlike WebSockets)
- All requests require authentication via a Bearer token
- The API returns standard JSON responses for all operations 