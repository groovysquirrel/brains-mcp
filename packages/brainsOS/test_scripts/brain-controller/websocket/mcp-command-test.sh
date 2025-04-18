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
echo "Example messages to test MCP command extraction (copy and paste):"
echo ""
echo "1. TEST CALCULATOR: Ask the brain to add two numbers using MCP:"
echo '{"action": "brain/terminal", "data": {"rawData": "Can you add 5 and 3 for me using the calculator command?", "requestStreaming": false, "commandId": "test_mcp_001", "timestamp": "2023-04-14T12:00:00Z", "source": "terminal"}}'
echo ""
echo "2. TEST KNOWLEDGE: Ask something that should NOT use a command:"
echo '{"action": "brain/terminal", "data": {"rawData": "What is the capital of France?", "requestStreaming": false, "commandId": "test_mcp_002", "timestamp": "2023-04-14T12:01:00Z", "source": "terminal"}}'
echo ""
echo "3. TEST TRANSFORM: Ask to convert some data using a transformer:"
echo '{"action": "brain/terminal", "data": {"rawData": "Can you convert this CSV to JSON: name,age\\nJohn,30\\nJane,25", "requestStreaming": false, "commandId": "test_mcp_003", "timestamp": "2023-04-14T12:02:00Z", "source": "terminal"}}'
echo ""
echo "4. TEST COMMAND LIST: Ask about available commands:"
echo '{"action": "brain/terminal", "data": {"rawData": "What commands or tools do you have available?", "requestStreaming": false, "commandId": "test_mcp_004", "timestamp": "2023-04-14T12:03:00Z", "source": "terminal"}}'
echo ""
echo "Note: This test script is specifically for testing MCP command extraction and execution."
echo "The brain should parse JSON from the response and send commands to the MCP server."
echo ""
echo "After running the test, check CloudWatch logs for MCP command processing:"
echo "aws logs tail /aws/lambda/dev-brainsOS-brain_wss_terminalHandler --follow"
echo "aws logs tail /aws/lambda/dev-brainsOS-MCPServer --follow"
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