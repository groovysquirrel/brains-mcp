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

# WebSocket URL with authentication
WS_URL="wss://dev-io.mcp.patternsatscale.com/latest?token=$ID_TOKEN"

echo "Connecting to WebSocket..."
echo "URL: $WS_URL"

# First, just connect and wait for the connection to be established
wscat -c "$WS_URL" --wait 5

# Then send a chat message
echo "Sending chat message..."
wscat -c "$WS_URL" --execute '
{
    "action": "chat",
    "data": {
        "messages": [
            { "role": "user", "content": "Hello, this is a test message" }
        ],
        "modelId": "anthropic.claude-3-sonnet-20240229-v1:0"
    }
}' 