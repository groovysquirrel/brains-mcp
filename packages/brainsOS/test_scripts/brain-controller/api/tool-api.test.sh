#!/bin/bash

# Tool API Test Script
# Tests the generic tool usage endpoint for the BrainOS API
# 
# To run this script:
# 1. Make it executable: chmod +x tool-api.test.sh
# 2. Run it: ./tool-api.test.sh
# 
# Interactive controls:
# - Press [Enter] to continue to the next test
# - Press [R] to retry the current test
# - Press [Q] to quit

# Load environment variables
source ../../.env.test

# Colors for terminal output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Set API Base URL (default to dev if not specified)
API_BASE_URL="${API_BASE_URL:-https://dev-api.brainsos.ai}/brain"
API_URL="$API_BASE_URL"

# Set debug mode (set to "true" to see more output)
DEBUG_MODE="${DEBUG_MODE:-false}"

# Parse starting step argument
START_STEP=1
if [[ $1 =~ ^-([0-9]+)$ ]]; then
    START_STEP=${BASH_REMATCH[1]}
    echo "Starting from step $START_STEP"
fi

# Store the last command and payload
LAST_ENDPOINT=""
LAST_PAYLOAD=""
LAST_DESCRIPTION=""

# Function to pause and handle retry
pause() {
    while true; do
        echo
        echo "Press [Enter] to continue, [R] to retry last test, or [Q] to quit..."
        read -n 1 key

        case $key in
            "")  # Enter key
                echo
                return
                ;;
            [Rr])  # R key
                echo
                if [ -n "$LAST_ENDPOINT" ]; then
                    echo "Retrying: $LAST_DESCRIPTION"
                    call_api "$LAST_ENDPOINT" "$LAST_PAYLOAD" "$LAST_DESCRIPTION"
                else
                    echo "No previous test to retry"
                fi
                ;;
            [Qq])  # Q key
                echo
                echo "Exiting..."
                exit 0
                ;;
        esac
    done
}

# Get Cognito tokens
echo -e "${BLUE}Getting Cognito tokens...${NC}"
TOKEN_RESPONSE=$(aws cognito-idp initiate-auth \
    --client-id "$APP_CLIENT_ID" \
    --auth-flow USER_PASSWORD_AUTH \
    --auth-parameters USERNAME="$COGNITO_USERNAME",PASSWORD="$COGNITO_PASSWORD" \
    --region "$COGNITO_REGION")

# Extract the ID token
ID_TOKEN=$(echo "$TOKEN_RESPONSE" | jq -r '.AuthenticationResult.IdToken')

if [ -z "$ID_TOKEN" ]; then
    echo -e "${RED}Failed to get ID token${NC}"
    exit 1
fi

echo -e "${GREEN}Successfully obtained ID token${NC}"
echo "Token length: ${#ID_TOKEN}"

# Extract user information from token to help debug
echo -e "${BLUE}Extracting user info from token...${NC}"
TOKEN_PAYLOAD=$(echo $ID_TOKEN | cut -d'.' -f2 | base64 -d 2>/dev/null || echo $ID_TOKEN | cut -d'.' -f2 | base64 -D 2>/dev/null)
USER_SUB=$(echo $TOKEN_PAYLOAD | jq -r '.sub')
USER_EMAIL=$(echo $TOKEN_PAYLOAD | jq -r '.email')
echo -e "${GREEN}Token contains:${NC}"
echo "  sub: $USER_SUB"
echo "  email: $USER_EMAIL"

echo -e "${YELLOW}Using API URL: $API_URL${NC}"
echo -e "${YELLOW}Using token in Authorization header: Bearer [TOKEN]${NC}"
echo

# Function to make API calls and display results
call_api() {
    local endpoint=$1
    local payload=$2
    local description=$3
    
    # Store for retry functionality
    LAST_ENDPOINT="$endpoint"
    LAST_PAYLOAD="$payload"
    LAST_DESCRIPTION="$description"
    
    echo -e "\n${YELLOW}${description}${NC}"
    
    local full_url="${API_URL}/${endpoint}"
    echo -e "${BLUE}Endpoint: ${full_url}${NC}"
    echo -e "${BLUE}Payload: ${payload}${NC}"
    
    # Use different curl options based on debug mode
    if [ "$DEBUG_MODE" = "true" ]; then
        # In debug mode, show more info including headers
        local response=$(curl -v -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${ID_TOKEN}" \
            -d "$payload" \
            "${full_url}" 2>&1)
        
        # Print full response in debug mode
        echo -e "${BLUE}Full Response:${NC}"
        echo "$response"
        
        # Extract just the response body
        local response_body=$(echo "$response" | sed -n '/{/,//p')
    else
        # In normal mode, just get the response body
        local response_body=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -H "Authorization: Bearer ${ID_TOKEN}" \
            -d "$payload" \
            "${full_url}")
    fi
    
    # Store the curl exit status
    local status=$?
    
    # Check if the call was successful
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}Response:${NC}"
        # Check if response is valid JSON
        if echo "$response_body" | jq '.' &>/dev/null; then
            echo "$response_body" | jq '.'
        else
            # If not valid JSON, print as is
            echo "$response_body"
        fi
    else
        echo -e "${RED}Failed to call API (status: $status)${NC}"
    fi
    
    echo -e "\n${YELLOW}----------------------------------------${NC}"
}

# Function to run a test step
run_step() {
    local step=$1
    local endpoint=$2
    local payload=$3
    local description=$4
    
    # Skip steps before the starting step
    if [ $step -lt $START_STEP ]; then
        return
    fi
    
    echo -e "\n${GREEN}--- Step $step: $description ---${NC}"
    call_api "$endpoint" "$payload" "$description"
    pause
}

echo -e "${GREEN}Starting Tool API tests...${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# Test 1: Use the calculator tool to add two numbers
run_step 1 "default/use/tool" '{
    "toolName": "calculator",
    "parameters": {
      "operation": "add",
      "a": 5,
      "b": 3
    },
    "userId": "'$USER_SUB'"
}' "Test 1: Use calculator tool to add 5 + 3"

# Test 2: Use the calculator tool to multiply two numbers
run_step 2 "default/use/tool" '{
    "toolName": "calculator",
    "parameters": {
      "operation": "multiply",
      "a": 4,
      "b": 7
    },
    "userId": "'$USER_SUB'"
}' "Test 2: Use calculator tool to multiply 4 * 7"

# Test 3: Use the random number generator tool
run_step 3 "default/use/tool" '{
    "toolName": "randomNumber",
    "parameters": {
      "min": 1,
      "max": 100,
      "type": "integer"
    },
    "userId": "'$USER_SUB'"
}' "Test 3: Use randomNumber tool to generate a number between 1 and 100"

# Test 4: Error case - missing tool name
run_step 4 "default/use/tool" '{
    "parameters": {
      "operation": "add",
      "a": 5,
      "b": 3
    },
    "userId": "'$USER_SUB'"
}' "Test 4: Error case - missing tool name"

echo -e "${GREEN}All tests completed!${NC}" 