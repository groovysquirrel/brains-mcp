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
echo "1. Simple chat message:"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Hello"}]}}'
echo ""
echo "2. Chat with model specified:"
echo '{"action": "llm/chat", "data": {"messages": [{"role": "user", "content": "Hello"}], "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"}}'
echo ""
echo "3. Stream test:"
echo '{"action": "llm/stream", "data": {"prompt": "Tell me a short story", "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"}}'
echo ""
echo "4. Controller prompt:"
echo '{"action": "controller/prompt", "data": {"prompt": "What is 2+2?"}}'
echo ""
echo "5. Controller MCP:"
echo '{"action": "controller/mcp", "data": {"command": "test"}}'
echo ""
echo "6. To exit gracefully, press Ctrl+C"
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
# You can type messages in JSON format like:
# {"action": "chat", "data": {"messages": [{"role": "user", "content": "Hello"}]}}