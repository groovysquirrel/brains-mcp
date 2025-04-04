#!/bin/bash

# Load environment variables
source ../.env.test

# Get Cognito tokens
echo "Getting Cognito tokens..."
TOKEN_RESPONSE=$(aws cognito-idp initiate-auth \
    --client-id "$APP_CLIENT_ID" \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME="$COGNITO_USERNAME",PASSWORD="$COGNITO_PASSWORD" \
    --region "$COGNITO_REGION")

# Extract the ID token
ID_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.AuthenticationResult.IdToken')

if [ -z "$ID_TOKEN" ]; then
    echo "Failed to get ID token"
    exit 1
fi

echo "Successfully obtained ID token"
echo "Token length: ${#ID_TOKEN}"

# WebSocket URL with authentication
WS_URL="wss://dev-io.mcp.patternsatscale.com?token=$ID_TOKEN"

echo "Attempting to connect to WebSocket..."
echo "URL: $WS_URL"

echo "----------------------------------------"
echo "Connection established! You can now send messages."
echo "Example messages (copy and paste):"
echo ""
echo "1. Basic chat with Claude 3 Sonnet (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Hello, how are you?"}], "provider": "bedrock", "modality": "text"}}'
echo ""
echo "2. Streaming chat with Claude 3 Sonnet (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Tell me a short story about a robot"}], "provider": "bedrock", "modality": "text", "streaming": true}}'
echo ""
echo "3. Chat with Llama 2 (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "What is machine learning?"}], "provider": "bedrock", "modality": "text", "modelId": "meta.llama2-70b-chat-v2:0"}}'
echo ""
echo "4. Chat with Claude 3 Haiku (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "What is the capital of France?"}], "provider": "bedrock", "modality": "text", "modelId": "anthropic.claude-3-haiku-20240307-v1:0"}}'
echo ""
echo "5. Chat with system prompt and temperature (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Write a haiku about coding"}], "provider": "bedrock", "modality": "text", "systemPrompt": "You are a creative poet who writes in various styles.", "temperature": 0.8}}'
echo ""
echo "6. Chat with Mistral (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Write a function to sort an array"}], "provider": "bedrock", "modality": "text", "modelId": "mistral.mistral-7b-instruct-v0:2"}}'
echo ""
echo "7. Chat with max tokens (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Explain quantum computing"}], "provider": "bedrock", "modality": "text", "maxTokens": 100}}'
echo ""
echo "8. Chat with metadata (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "What is the weather?"}], "provider": "bedrock", "modality": "text", "metadata": {"location": "New York", "time": "morning"}}}'
echo ""
echo "9. To exit gracefully, press Ctrl+C"
echo "----------------------------------------"

# Function to handle cleanup on script exit
cleanup() {
    echo "Closing WebSocket connection..."
    # The websocat process will be terminated by the trap
}

# Set up trap for Ctrl+C
trap cleanup SIGINT SIGTERM

# Connect and keep the connection open, passing token as both query param and header
websocat -v "$WS_URL" -H "Authorization: Bearer $ID_TOKEN"

# Note: websocat will keep the connection open and allow interactive input
# You can type messages in JSON format like the examples above