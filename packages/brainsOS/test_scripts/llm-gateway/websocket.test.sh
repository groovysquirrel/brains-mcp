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
echo "1. LEGACY: Claude with system prompt (non-streaming):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "tell me a joke"}], "provider": "bedrock", "modality": "text", "systemPrompt": "talk like you are a pirate"}}'
echo ""
echo "2. LEGACY: Claude with system prompt (streaming):"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "tell me a joke"}], "provider": "bedrock", "modality": "text", "systemPrompt": "talk like you are a pirate", "streaming": true}}'
echo ""
echo "3. ONE-OFF PROMPT: Claude prompt (non-streaming):"
echo '{"action": "llm/prompt", "data": {"messages": [{"role": "user", "content": "tell me a joke"}], "provider": "bedrock", "modality": "text", "systemPrompt": "talk like you are a pirate"}}'
echo ""
echo "4. ONE-OFF PROMPT: Claude prompt (streaming):"
echo '{"action": "llm/prompt", "data": {"messages": [{"role": "user", "content": "tell me a joke"}], "provider": "bedrock", "modality": "text", "systemPrompt": "talk like you are a pirate", "streaming": true}}'
echo ""
echo "5. NEW CONVERSATION: Start a new conversation with Claude:"
echo '{"action": "llm/conversation", "data": {"messages": [{"role": "user", "content": "tell me a joke"}], "provider": "bedrock", "modality": "text", "systemPrompt": "talk like you are a pirate", "title": "Pirate Jokes Conversation"}}'
echo ""
echo "6. NEW CONVERSATION: Start a new streaming conversation with Claude:"
echo '{"action": "llm/conversation", "data": {"messages": [{"role": "user", "content": "tell me a joke"}], "provider": "bedrock", "modality": "text", "systemPrompt": "talk like you are a pirate", "title": "Pirate Jokes Conversation", "streaming": true}}'
echo ""
echo "7. CONTINUE CONVERSATION: Continue a conversation (replace CONVERSATION_ID):"
echo '{"action": "llm/conversation", "data": {"conversationId": "CONVERSATION_ID", "messages": [{"role": "user", "content": "tell me another joke"}], "provider": "bedrock", "modality": "text"}}'
echo ""
echo "8. LLAMA CONVERSATION: Start a new conversation with Llama:"
echo '{"action": "llm/conversation", "data": {"messages": [{"role": "user", "content": "tell me a joke"}], "provider": "bedrock", "modelId": "meta.llama3-70b-instruct-v1:0", "modality": "text", "systemPrompt": "talk like a pirate", "title": "Llama Pirate Jokes"}}'
echo ""
echo "To exit gracefully, press Ctrl+C"
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