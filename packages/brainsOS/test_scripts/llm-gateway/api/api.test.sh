#!/bin/bash

# Load environment variables
source ../../.env.test

# SECURITY NOTE: This script follows a secure approach where user identity
# is always determined from the authentication token, never from request body.
# The LLM Gateway API ignores any userId in the request body to prevent impersonation attacks.

# Set API Base URL (you may need to adjust this)
API_BASE_URL="${API_BASE_URL:-https://dev-api.brainsos.ai}/llm-gateway"

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
    
    echo -e "\n${YELLOW}TEST: ${description}${NC}"
    echo -e "${BLUE}Endpoint: ${endpoint}${NC}"
    echo -e "${BLUE}Payload: ${payload}${NC}"
    
    # Make the API call
    local response=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $ID_TOKEN" \
        -d "$payload" \
        "${API_BASE_URL}/${endpoint}")
    
    # Store the curl exit status
    local status=$?
    
    # Check if the call was successful
    if [ $status -eq 0 ]; then
        echo -e "${GREEN}Response:${NC}"
        # Check if response is valid JSON
        if echo "$response" | jq '.' &>/dev/null; then
            echo "$response" | jq '.'
            
            # If this is a conversation creation, extract the conversationId for later use
            if [[ "$endpoint" == "conversation" && "$description" == *"NEW CONVERSATION"* ]]; then
                CONVERSATION_ID=$(echo "$response" | jq -r '.conversationId')
                if [ "$CONVERSATION_ID" != "null" ] && [ ! -z "$CONVERSATION_ID" ]; then
                    echo -e "${GREEN}Saved conversation ID: ${CONVERSATION_ID}${NC}"
                fi
            fi
        else
            # If not valid JSON, print as is
            echo "$response"
        fi
    else
        echo -e "${RED}Failed to call API (status: $status)${NC}"
    fi
    
    echo -e "\n${YELLOW}----------------------------------------${NC}"
}

echo -e "${GREEN}Starting API tests...${NC}"
echo -e "${YELLOW}API Base URL: ${API_BASE_URL}${NC}"
echo -e "${YELLOW}HTTP Headers: Authorization: Bearer [TOKEN]${NC}"
echo -e "${YELLOW}----------------------------------------${NC}"

# Test 0: Verify the endpoint is reachable with a simple test
echo -e "\n${BLUE}TEST 0: VERIFY ENDPOINT CONNECTIVITY${NC}"
curl -v -X GET "${API_BASE_URL}/prompt" \
    -H "Authorization: Bearer $ID_TOKEN" 2>&1 | grep -E "< HTTP|< Location|^[{]"

# Test 1: ONE-OFF PROMPT with Claude
echo -e "\n${BLUE}TEST 1: ONE-OFF PROMPT with Claude${NC}"
call_api "prompt" '{
    "messages": [{"role": "user", "content": "tell me a joke"}],
    "provider": "bedrock",
    "modality": "text",
    "systemPrompt": "talk like you are a pirate",
    "userId": "'"$USER_SUB"'"
}' "ONE-OFF PROMPT: Claude prompt"

# Test 2: NEW CONVERSATION with Claude
echo -e "\n${BLUE}TEST 2: NEW CONVERSATION with Claude${NC}"
call_api "conversation" '{
    "messages": [{"role": "user", "content": "tell me a joke"}],
    "provider": "bedrock",
    "modality": "text",
    "systemPrompt": "talk like you are a pirate",
    "title": "Pirate Jokes Conversation",
    "tags": ["pirate", "jokes", "demo"],
    "userId": "'"$USER_SUB"'"
}' "NEW CONVERSATION: Start a new conversation with Claude"

# Test 3: CONTINUE CONVERSATION (uses the conversationId from Test 2)
if [ ! -z "$CONVERSATION_ID" ]; then
    echo -e "\n${BLUE}TEST 3: CONTINUE CONVERSATION${NC}"
    call_api "conversation" '{
        "conversationId": "'"$CONVERSATION_ID"'",
        "messages": [{"role": "user", "content": "tell me another joke"}],
        "provider": "bedrock",
        "modality": "text",
        "userId": "'"$USER_SUB"'"
    }' "CONTINUE CONVERSATION: Continue the previous conversation"
else
    echo -e "\n${RED}Skipping Test 3: No conversation ID available${NC}"
fi

# Test 4: LLAMA CONVERSATION
echo -e "\n${BLUE}TEST 4: LLAMA CONVERSATION${NC}"
call_api "conversation" '{
    "messages": [{"role": "user", "content": "tell me a joke"}],
    "provider": "bedrock",
    "modelId": "meta.llama3-70b-instruct-v1:0",
    "modality": "text",
    "systemPrompt": "talk like a pirate",
    "title": "Llama Pirate Jokes",
    "tags": ["llama", "pirate", "project gr00vy"],
    "userId": "'"$USER_SUB"'"
}' "LLAMA CONVERSATION: Start a new conversation with Llama"

# Test 5: TAGGED CONVERSATION
echo -e "\n${BLUE}TEST 5: TAGGED CONVERSATION${NC}"
call_api "conversation" '{
    "messages": [{"role": "user", "content": "Create a plan for our project"}],
    "provider": "bedrock",
    "modality": "text",
    "title": "Project Planning",
    "tags": ["project gr00vy", "planning", "task"],
    "userId": "'"$USER_SUB"'"
}' "TAGGED CONVERSATION: Start conversation with specific project tags"

# Test 6: LIST CONVERSATIONS
echo -e "\n${BLUE}TEST 6: LIST CONVERSATIONS${NC}"
call_api "list-conversations" '{
    "userId": "'"$USER_SUB"'"
}' "LIST CONVERSATIONS: Get all conversations for the user"

# Test 7: GET CONVERSATION
if [ ! -z "$CONVERSATION_ID" ]; then
    echo -e "\n${BLUE}TEST 7: GET CONVERSATION${NC}"
    call_api "get-conversation" '{
        "conversationId": "'"$CONVERSATION_ID"'",
        "userId": "'"$USER_SUB"'"
    }' "GET CONVERSATION: Get details of a specific conversation"
else
    echo -e "\n${RED}Skipping Test 7: No conversation ID available${NC}"
fi

# Test 8: DELETE CONVERSATION
if [ ! -z "$CONVERSATION_ID" ]; then
    echo -e "\n${BLUE}TEST 8: DELETE CONVERSATION${NC}"
    call_api "delete-conversation" '{
        "conversationId": "'"$CONVERSATION_ID"'",
        "userId": "'"$USER_SUB"'"
    }' "DELETE CONVERSATION: Delete a specific conversation"
else
    echo -e "\n${RED}Skipping Test 8: No conversation ID available${NC}"
fi

echo -e "\n${GREEN}API tests completed!${NC}"