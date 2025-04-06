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
echo "1. Default Claude 3 model:"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Hello, how are you?"}], "provider": "bedrock", "modality": "text"}}'
echo ""
echo "2. Specific Claude 3 model:"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "What is the capital of France?"}], "provider": "bedrock", "modality": "text", "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"}}'
echo ""
echo "3. Llama model (v2) - Model not configured"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Explain quantum computing in simple terms"}], "provider": "bedrock", "modality": "text", "modelId": "meta.llama2-13b-chat-v1"}}'
echo ""
echo "4. Llama model - Model not ready"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Explain quantum computing in simple terms"}], "provider": "bedrock", "modality": "text", "modelId": "meta.llama3-2-1b-instruct-v1:0"}}'
echo ""
echo "5. Llama model - Model READY"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Explain quantum computing in simple terms"}], "provider": "bedrock", "modality": "text", "modelId": "meta.llama3-70b-instruct-v1:0"}}'
echo ""
echo "6. Claude 2 model (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Write a short poem about technology"}], "provider": "bedrock", "modality": "text", "modelId": "anthropic.claude-v2"}}'
echo ""
echo "7. Streaming chat with Claude 3 (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Tell me a short story about a robot"}], "provider": "bedrock", "modality": "text", "streaming": true}}'
echo ""
echo "8. Chat with system prompt (v2):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Write a haiku about coding"}], "provider": "bedrock", "modality": "text", "systemPrompt": "You are a creative poet who writes in various styles."}}'
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