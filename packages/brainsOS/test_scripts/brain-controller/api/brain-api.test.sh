#!/bin/bash

# Test script for Brain Controller API endpoints
# Tests MCP tool listing and command execution

# Load environment variables
source ../../.env.test

# Set API Base URL (you may need to adjust this)
API_BASE_URL="${API_BASE_URL:-https://dev-api.brainsos.ai}/brain"

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
    local method=${4:-POST}
    
    echo -e "\n${YELLOW}TEST: ${description}${NC}"
    echo -e "${BLUE}Endpoint: ${endpoint}${NC}"
    
    # Add token as query parameter
    local full_url="${API_BASE_URL}/${endpoint}?token=${ID_TOKEN}"
    
    if [ "$method" = "POST" ]; then
        echo -e "${BLUE}Payload: ${payload}${NC}"
        
        # Make the API call with token as query parameter
        local response=$(curl -s -X POST \
            -H "Content-Type: application/json" \
            -d "$payload" \
            "${full_url}")
    else
        # Make the API call (GET) with token as query parameter
        local response=$(curl -s "${full_url}")
    fi
    
    # Store the curl exit status
    local status=$?
    
    # Check if the call was successful
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}Response:${NC}"
        # Check if response is valid JSON
        if echo "$response" | jq '.' &>/dev/null; then
            echo "$response" | jq '.'
            
            # If this is a command execution, extract the requestId for later use
            if [[ "$endpoint" == "mcp-execute" ]]; then
                REQUEST_ID=$(echo "$response" | jq -r '.requestId')
                if [ "$REQUEST_ID" != "null" ] && [ ! -z "$REQUEST_ID" ]; then
                    echo -e "${GREEN}Saved request ID: ${REQUEST_ID}${NC}"
                fi
            }
        else
            # If not valid JSON, print as is
            echo "$response"
        fi
    else
        echo -e "${RED}Failed to call API (status: $status)${NC}"
    fi
    
    echo -e "\n${YELLOW}----------------------------------------${NC}"
}

echo -e "${GREEN}Starting Brain Controller API tests...${NC}"
echo -e "${YELLOW}API Base URL: ${API_BASE_URL}${NC}"
echo -e "${YELLOW}Using token as query parameter: ?token=[ID_TOKEN]${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# Test 0: Verify the endpoint is reachable with a simple test
echo -e "\n${BLUE}TEST 0: VERIFY ENDPOINT CONNECTIVITY${NC}"
curl -v -X GET "${API_BASE_URL}/mcp-tools?token=${ID_TOKEN}" 2>&1 | grep -E "< HTTP|< Location|^[{]"

# Test 1: Get list of MCP tools
echo -e "\n${BLUE}TEST 1: LIST MCP TOOLS${NC}"
call_api "mcp-tools" '' "Get a list of available MCP tools" "GET"

# Test 2: Get list of MCP transformers
echo -e "\n${BLUE}TEST 2: LIST MCP TRANSFORMERS${NC}"
call_api "mcp-transformers" '' "Get a list of available MCP transformers" "GET"

# Test 3: Get list of MCP prompts
echo -e "\n${BLUE}TEST 3: LIST MCP PROMPTS${NC}"
call_api "mcp-prompts" '' "Get a list of available MCP prompts" "GET"

# Test 4: Get list of MCP resources
echo -e "\n${BLUE}TEST 4: LIST MCP RESOURCES${NC}"
call_api "mcp-resources" '' "Get a list of available MCP resources" "GET"

# Test 5: Get list of all MCP components
echo -e "\n${BLUE}TEST 5: LIST ALL MCP COMPONENTS${NC}"
call_api "mcp-all" '' "Get a list of all available MCP components" "GET"

# Test 6: Execute a random number MCP command (simple test)
echo -e "\n${BLUE}TEST 6: EXECUTE RANDOM NUMBER MCP COMMAND${NC}"
call_api "mcp-execute" '{
    "toolName": "randomNumber",
    "parameters": {
        "min": 1,
        "max": 100
    }
}' "Execute randomNumber MCP command"

# Test 7: Execute a weather MCP command (if available)
echo -e "\n${BLUE}TEST 7: EXECUTE WEATHER MCP COMMAND${NC}"
call_api "mcp-execute" '{
    "toolName": "getWeather",
    "parameters": {
        "location": "San Francisco",
        "units": "imperial"
    }
}' "Execute getWeather MCP command (if available)"

# Test 8: Execute a calculation MCP command (if available)
echo -e "\n${BLUE}TEST 8: EXECUTE CALCULATION MCP COMMAND${NC}"
call_api "mcp-execute" '{
    "toolName": "calculate",
    "parameters": {
        "expression": "42 * 3.14"
    }
}' "Execute calculate MCP command (if available)"

# Test 9: Check status of a command (using requestId from Test 6)
if [ ! -z "$REQUEST_ID" ]; then
    echo -e "\n${BLUE}TEST 9: CHECK MCP COMMAND STATUS${NC}"
    call_api "mcp-status?requestId=${REQUEST_ID}" '' "Check status of MCP command" "GET"
else
    echo -e "\n${RED}Skipping Test 9: No request ID available${NC}"
fi

# Test 10: Execute MCP command with invalid tool name (should fail)
echo -e "\n${BLUE}TEST 10: EXECUTE INVALID MCP COMMAND${NC}"
call_api "mcp-execute" '{
    "toolName": "nonExistentTool",
    "parameters": {
        "foo": "bar"
    }
}' "Execute non-existent MCP command (should fail)"

# Test 11: Execute MCP command with missing tool name (should fail)
echo -e "\n${BLUE}TEST 11: EXECUTE MCP COMMAND WITHOUT TOOL NAME${NC}"
call_api "mcp-execute" '{
    "parameters": {
        "foo": "bar"
    }
}' "Execute MCP command without tool name (should fail)"

echo -e "\n${GREEN}Brain Controller API tests completed!${NC}" 