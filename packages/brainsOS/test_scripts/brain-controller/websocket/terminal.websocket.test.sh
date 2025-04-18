#!/bin/bash

# Load environment variables
source ../../.env.test

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
WS_URL="$WSS_BASE_URL?token=$ID_TOKEN"

echo "Attempting to connect to WebSocket..."
echo "URL: $WS_URL"

echo "----------------------------------------"
echo "Connection established! You can now send messages."
echo "Example messages (copy and paste):"
echo ""
echo "1. SIMPLE CHAT: Ask the brain what its name is:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "What is your name?", "requestStreaming": false, "commandId": "test_cmd_001", "timestamp": "2023-04-14T12:00:00Z", "source": "terminal"}}'
echo ""
echo "2. SIMPLE CHAT: Ask about capabilities:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "What can you help me with?", "requestStreaming": false, "commandId": "test_cmd_002", "timestamp": "2023-04-14T12:01:00Z", "source": "terminal"}}'
echo ""
echo "3. SIMPLE CHAT: Test with system command:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "Can you list files in the current directory?", "requestStreaming": false, "commandId": "test_cmd_003", "timestamp": "2023-04-14T12:02:00Z", "source": "terminal"}}'
echo ""
echo ""
echo "Note: The WebSocket route 'brain/terminal' expects messages with 'brain/terminal' action."
echo "The handler has been updated to also accept legacy 'terminal' format for backward compatibility."
echo ""
echo "After running the test, check CloudWatch logs for errors with:"
echo "aws logs tail /aws/lambda/dev-brainsOS-brain_wss_terminalHandler --follow"
echo "aws logs tail /aws/lambda/dev-brainsOS-BrainController --follow"
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
websocat -v "$WS_URL"
# -H "Authorization: Bearer $ID_TOKEN"

# Note: websocat will keep the connection open and allow interactive input
# You can type messages in JSON format like the examples above