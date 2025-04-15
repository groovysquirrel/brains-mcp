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
echo "1. LIST TOOLS: Get all available tools:"
echo '{"action": "mcp/request", "data": {"type": "tool", "action": "list"}}'
echo ""
echo "2. CALCULATOR: Add two numbers:"
echo '{"action": "mcp/request", "data": {"type": "tool", "action": "execute", "toolName": "calculator", "parameters": {"operation": "add", "a": 5, "b": 3}}}'
echo ""
echo "3. CALCULATOR: Multiply two numbers:"
echo '{"action": "mcp/request", "data": {"type": "tool", "action": "execute", "toolName": "calculator", "parameters": {"operation": "multiply", "a": 4, "b": 6}}}'
echo ""
echo "4. RANDOM NUMBER: Generate a random integer:"
echo '{"action": "mcp/request", "data": {"type": "tool", "action": "execute", "toolName": "randomNumber", "parameters": {"min": 1, "max": 100, "type": "integer"}}}'
echo ""
echo "5. RANDOM NUMBER: Generate a random float:"
echo '{"action": "mcp/request", "data": {"type": "tool", "action": "execute", "toolName": "randomNumber", "parameters": {"min": 0, "max": 1, "type": "float"}}}'
echo ""
echo "6. TABLE CONVERTER: Convert CSV to JSON:"
echo '{"action": "mcp/request", "data": {"type": "tool", "action": "execute", "toolName": "tableConverter", "parameters": {"input": "name,age\nJohn,30\nJane,25", "format": "csv", "outputFormat": "json"}}}'
echo ""
echo "7. TABLE CONVERTER: Convert JSON to Markdown:"
echo '{"action": "mcp/request", "data": {"type": "tool", "action": "execute", "toolName": "tableConverter", "parameters": {"input": "[{\"name\":\"John\",\"age\":30},{\"name\":\"Jane\",\"age\":25}]", "format": "json", "outputFormat": "markdown"}}}'
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