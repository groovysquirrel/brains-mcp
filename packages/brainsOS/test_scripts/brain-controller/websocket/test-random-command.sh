#!/bin/bash

# Load environment variables from .env.test
if [ -f ../../.env.test ]; then
    echo 'Loading environment from ../../.env.test'
    export $(grep -v '^#' ../../.env.test | xargs)
fi

# Get WebSocket URL
WS_URL=${WS_URL:-"wss://api.example.com/v1"}
echo "Using WebSocket URL: $WS_URL"

# User credentials
USERNAME=${TEST_USERNAME:-"test@example.com"}
PASSWORD=${TEST_PASSWORD:-"password"}
CLIENT_ID=${COGNITO_CLIENT_ID:-"client-id"}

# Get authentication token using AWS Cognito
echo "Getting authentication token..."
AUTH_RESULT=$(aws cognito-idp initiate-auth \
    --client-id $CLIENT_ID \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME=$USERNAME,PASSWORD=$PASSWORD \
    --query 'AuthenticationResult.IdToken' \
    --output text)

if [ $? -ne 0 ] || [ -z "$AUTH_RESULT" ]; then
    echo "Error getting authentication token"
    exit 1
fi

echo "Authentication successful"
ID_TOKEN=$AUTH_RESULT

# Create timestamp for request
TIMESTAMP=$(date -u '+%Y-%m-%dT%H:%M:%SZ')

# Test case 1: Send a random number request with the correct camelCase command name
echo "===== Testing Random Number Command ====="
echo "Sending test message..."

# Construct the message
MESSAGE='{
  "action": "brain/terminal/request", 
  "data": {
    "rawData": "Generate a random number between 1 and 100 using the randomNumber command", 
    "requestStreaming": false, 
    "commandId": "test_cmd_001", 
    "timestamp": "'$TIMESTAMP'", 
    "source": "terminal"
  }
}'

# Use websocat to connect and send message
echo "$MESSAGE" | websocat -n --text "$WS_URL?token=$ID_TOKEN"

# Wait for responses
echo "Waiting for response..."
sleep 3

# Clean up
echo "===== Test completed ====="
echo "Check CloudWatch logs for command processing details" 