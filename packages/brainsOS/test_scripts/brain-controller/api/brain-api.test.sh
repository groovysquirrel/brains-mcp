#!/bin/bash

# Test script for Brain Controller API endpoints
# Tests brain operations like listing tools and executing commands

# Load environment variables
source ../../.env.test

# Set API Base URL (you may need to adjust this)
API_BASE_URL="${API_BASE_URL:-https://dev-api.brainsos.ai}/brain"

# Set debug mode (set to "true" to see more output)
DEBUG_MODE="${DEBUG_MODE:-true}"

# Export API_URL for the BrainController
export API_URL="${API_BASE_URL:-https://dev-api.brainsos.ai}"
echo -e "Setting API_URL=${API_URL} for BrainController"

# Colors for better output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

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

# Function to make API calls and display results
call_api() {
    local endpoint=$1
    local payload=$2
    local description=$3
    local method="POST" # Only using POST since that's what's configured in the API router
    
    echo -e "\n${YELLOW}TEST: ${description}${NC}"
    echo -e "${BLUE}Endpoint: ${endpoint}${NC}"
    
    # Use token in Authorization header instead of query parameter
    local full_url="${API_BASE_URL}/${endpoint}"
    
    # Echo the full URL 
    echo -e "${YELLOW}Full URL: ${full_url}${NC}"
    
    # Always use POST for API calls
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
        
        # Extract just the response body by looking for the first { character
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
            
            # If this is a command execution, extract the requestId for later use
            if [[ "$endpoint" == "default/execute/command" ]]; then
                REQUEST_ID=$(echo "$response_body" | jq -r '.requestId')
                if [ "$REQUEST_ID" != "null" ] && [ ! -z "$REQUEST_ID" ]; then
                    echo -e "${GREEN}Saved request ID: ${REQUEST_ID}${NC}"
                fi
            fi
        else
            # If not valid JSON, print as is
            echo "$response_body"
        fi
    else
        echo -e "${RED}Failed to call API (status: $status)${NC}"
    fi
    
    echo -e "\n${YELLOW}----------------------------------------${NC}"
}

echo -e "${GREEN}Starting Brain Controller API tests...${NC}"
echo -e "${YELLOW}API Base URL: ${API_BASE_URL}${NC}"
echo -e "${YELLOW}Using token in Authorization header instead of query parameter${NC}"
echo -e "${YELLOW}Debug mode: ${DEBUG_MODE}${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# Test 0: Verify the endpoint is reachable with a simple test
echo -e "\n${BLUE}TEST 0: VERIFY ENDPOINT CONNECTIVITY${NC}"
FULL_URL="${API_BASE_URL}/default/list/tools"
echo -e "${YELLOW}Full URL: ${FULL_URL}${NC}"
# Using POST instead of GET to match the router configuration
if [ "$DEBUG_MODE" = "true" ]; then
    curl -v -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ID_TOKEN}" \
      -d '{"action":"list","type":"tools","userId":"'$USER_SUB'"}' \
      "${FULL_URL}" 2>&1
else
    curl -v -X POST \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer ${ID_TOKEN}" \
      -d '{"action":"list","type":"tools","userId":"'$USER_SUB'"}' \
      "${FULL_URL}" 2>&1 | grep -E "< HTTP|< Location|^[{]"
fi

# Test 1: Get list of MCP tools
echo -e "\n${BLUE}TEST 1: LIST MCP TOOLS${NC}"
call_api "default/list/tools" '{"action":"list","type":"tools","userId":"'$USER_SUB'"}' "Get a list of available MCP tools"

# Test 2: Get list of MCP transformers
echo -e "\n${BLUE}TEST 2: LIST MCP TRANSFORMERS${NC}"
call_api "default/list/transformers" '{"action":"list","type":"transformers","userId":"'$USER_SUB'"}' "Get a list of available MCP transformers"

# Stop after the first two tests for now
echo -e "\n${GREEN}First two API tests completed!${NC}"
exit 0

# The rest of the tests are commented out for now
: '
# Test 3: Get list of MCP prompts
echo -e "\n${BLUE}TEST 3: LIST MCP PROMPTS${NC}"
call_api "default/list/prompts" '{"action":"list","type":"prompts","userId":"'$USER_SUB'"}' "Get a list of available MCP prompts"

# Test 4: Get list of MCP resources
echo -e "\n${BLUE}TEST 4: LIST MCP RESOURCES${NC}"
call_api "default/list/resources" '{"action":"list","type":"resources","userId":"'$USER_SUB'"}' "Get a list of available MCP resources"

# Test 5: Get list of all MCP components
echo -e "\n${BLUE}TEST 5: LIST ALL MCP COMPONENTS${NC}"
call_api "default/list/mcp" '{"action":"list","type":"all","userId":"'$USER_SUB'"}' "Get a list of all available MCP components"

# Test 6: Get brain configuration
echo -e "\n${BLUE}TEST 6: GET BRAIN CONFIGURATION${NC}"
call_api "default/list/config" '{"action":"list","type":"config","userId":"'$USER_SUB'"}' "Get the brain configuration"

# Test 7: Execute a random number MCP command (simple test)
echo -e "\n${BLUE}TEST 7: EXECUTE RANDOM NUMBER MCP COMMAND${NC}"
call_api "default/execute/command" '{
    "toolName": "randomNumber",
    "parameters": {
        "min": 1,
        "max": 100
    },
    "userId": "'$USER_SUB'"
}' "Execute randomNumber MCP command"

# Test 8: Execute a weather MCP command (if available)
echo -e "\n${BLUE}TEST 8: EXECUTE WEATHER MCP COMMAND${NC}"
call_api "default/execute/command" '{
    "toolName": "getWeather",
    "parameters": {
        "location": "San Francisco",
        "units": "imperial"
    },
    "userId": "'$USER_SUB'"
}' "Execute getWeather MCP command (if available)"

# Test 9: Execute a calculation MCP command (if available)
echo -e "\n${BLUE}TEST 9: EXECUTE CALCULATION MCP COMMAND${NC}"
call_api "default/execute/command" '{
    "toolName": "calculate",
    "parameters": {
        "expression": "42 * 3.14"
    },
    "userId": "'$USER_SUB'"
}' "Execute calculate MCP command (if available)"

# Test 10: Check status of a command (using requestId from Test 7)
if [ ! -z "$REQUEST_ID" ]; then
    echo -e "\n${BLUE}TEST 10: CHECK MCP COMMAND STATUS${NC}"
    call_api "default/status/command?requestId=${REQUEST_ID}" '{"requestId": "'"${REQUEST_ID}"'", "userId": "'$USER_SUB'"}' "Check status of MCP command"
else
    echo -e "\n${RED}Skipping Test 10: No request ID available${NC}"
fi

# Test 11: Execute MCP command with invalid tool name (should fail)
echo -e "\n${BLUE}TEST 11: EXECUTE INVALID MCP COMMAND${NC}"
call_api "default/execute/command" '{
    "toolName": "nonExistentTool",
    "parameters": {
        "foo": "bar"
    },
    "userId": "'$USER_SUB'"
}' "Execute non-existent MCP command (should fail)"

# Test 12: Execute MCP command with missing tool name (should fail)
echo -e "\n${BLUE}TEST 12: EXECUTE MCP COMMAND WITHOUT TOOL NAME${NC}"
call_api "default/execute/command" '{
    "parameters": {
        "foo": "bar"
    },
    "userId": "'$USER_SUB'"
}' "Execute MCP command without tool name (should fail)"
'

echo -e "\n${GREEN}Brain Controller API tests completed!${NC}" 