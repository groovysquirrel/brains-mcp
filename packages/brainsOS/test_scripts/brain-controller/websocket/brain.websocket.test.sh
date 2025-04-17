#!/bin/bash

# Test script for Brain Controller WebSocket
# Allows testing MCP command execution through the brain controller

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
echo "1. SEND CHAT: Request that should trigger MCP command in the response:"
echo '{"action": "brain/chat", "data": {"rawData": "Generate a random number between 1 and 100", "requestStreaming": false, "commandId": "cmd_'$(date +%s)'", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "source": "terminal"}}'
echo ""
echo "2. SEND CHAT: Ask about MCP tools available:"
echo '{"action": "brain/chat", "data": {"rawData": "What MCP tools do you have available?", "requestStreaming": false, "commandId": "cmd_'$(date +%s)'", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "source": "terminal"}}'
echo ""
echo "3. DIRECT MCP: Directly send a random number MCP command:"
echo '{"action": "brain/mcp", "data": {"toolName": "randomNumber", "parameters": {"min": 1, "max": 100}, "commandId": "cmd_'$(date +%s)'", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "source": "terminal"}}'
echo ""
echo "4. DIRECT MCP: Weather check if available:"
echo '{"action": "brain/mcp", "data": {"toolName": "getWeather", "parameters": {"location": "San Francisco", "units": "metric"}, "commandId": "cmd_'$(date +%s)'", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "source": "terminal"}}'
echo ""
echo "5. DIRECT MCP: Calculate if available:"
echo '{"action": "brain/mcp", "data": {"toolName": "calculate", "parameters": {"expression": "42 * 3.14"}, "commandId": "cmd_'$(date +%s)'", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "source": "terminal"}}'
echo ""
echo "6. LIST: Get list of available brains:"
echo '{"action": "brain/list", "data": {"commandId": "cmd_'$(date +%s)'", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'", "source": "terminal"}}'
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

# Connect and keep the connection open, passing token as both query param
websocat -v "$WS_URL"

# Note: websocat will keep the connection open and allow interactive input
# You can type messages in JSON format like the examples above 