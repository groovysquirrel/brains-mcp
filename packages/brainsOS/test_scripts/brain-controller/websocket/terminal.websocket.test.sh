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
echo "4. CONVERSATION TEST 1: First message with explicit conversationId:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "My name is John. Remember that.", "requestStreaming": false, "commandId": "conv_cmd_001", "timestamp": "2023-04-14T12:03:00Z", "source": "terminal", "conversationId": "test-conversation-1234"}}'
echo ""
echo "5. CONVERSATION TEST 2: Follow-up message with same conversationId:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "What is my name?", "requestStreaming": false, "commandId": "conv_cmd_002", "timestamp": "2023-04-14T12:04:00Z", "source": "terminal", "conversationId": "test-conversation-1234"}}'
echo ""
echo "6. CONVERSATION TEST 3: MCP Command with same conversationId:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "Generate a random number between 1 and 100 using the random number generator tool", "requestStreaming": false, "commandId": "conv_cmd_003", "timestamp": "2023-04-14T12:05:00Z", "source": "terminal", "conversationId": "test-conversation-1234"}}'
echo ""
echo "7. CONVERSATION TEST 4: Follow-up after MCP Command with same conversationId:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "What was the previous random number you generated for me?", "requestStreaming": false, "commandId": "conv_cmd_004", "timestamp": "2023-04-14T12:06:00Z", "source": "terminal", "conversationId": "test-conversation-1234"}}'
echo ""
echo "8. NEW CONVERSATION: Start a new conversation with different conversationId:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "This is a new conversation. I am Jane.", "requestStreaming": false, "commandId": "new_conv_001", "timestamp": "2023-04-14T12:07:00Z", "source": "terminal", "conversationId": "test-conversation-456"}}'
echo ""
echo "9. NEW CONVERSATION FOLLOW-UP: Message to the second conversation:"
echo '{"action": "brain/terminal/request", "data": {"rawData": "What is my name in this conversation?", "requestStreaming": false, "commandId": "new_conv_002", "timestamp": "2023-04-14T12:08:00Z", "source": "terminal", "conversationId": "test-conversation-456"}}'
echo ""
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