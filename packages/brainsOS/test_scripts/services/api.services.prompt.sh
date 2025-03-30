#!/bin/bash

# Load environment variables
source ../.env.test

# Common parameters for all requests
BASE_CMD="npx aws-api-gateway-cli-test \
--username=\"$COGNITO_USERNAME\" \
--password=\"$COGNITO_PASSWORD\" \
--user-pool-id=\"$USER_POOL_ID\" \
--app-client-id=\"$APP_CLIENT_ID\" \
--cognito-region=\"$COGNITO_REGION\" \
--identity-pool-id=\"$IDENTITY_POOL_ID\" \
--invoke-url=\"$API_BASE_URL\" \
--api-gateway-region=\"$API_GATEWAY_REGION\""

# Parse starting step argument
START_STEP=1
if [[ $1 =~ ^-([0-9]+)$ ]]; then
    START_STEP=${BASH_REMATCH[1]}
    echo "Starting from step $START_STEP"
fi

# Store the last command
LAST_COMMAND=""

# Function to execute a command and store it
execute_command() {
    local cmd="$1"
    echo "Executing: $cmd"
    LAST_COMMAND="$cmd"
    eval "$cmd"
}

# Function to pause and handle retry
pause() {
    while true; do
        echo
        echo "Press [Enter] to continue, [R] to retry last command, or [Q] to quit..."
        read -n 1 key

        case $key in
            "")  # Enter key
                echo
                return
                ;;
            [Rr])  # R key
                echo
                echo "Retrying last command..."
                if [ -n "$LAST_COMMAND" ]; then
                    eval "$LAST_COMMAND"
                else
                    echo "No previous command to retry"
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

run_step() {
    local step=$1
    if [ $step -ge $START_STEP ]; then
        $2
        pause
    fi
}

step1() {
    echo "1. Start new conversation
Creates a new conversation with a programming joke prompt.

--path-template='/latest/services/prompt/conversation'
--method='POST'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"Tell me a joke about programming\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-123\"
    }'"
}

step2() {
    echo "2. Continue conversation
Continues the previous conversation by asking for another joke.

--path-template='/latest/services/prompt/conversation'
--method='POST'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"That was funny! Tell me another one\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-123\"
    }'"
}

step3() {
    echo "3. Get conversation history
Retrieves the history of the test conversation.

--path-template='/latest/services/prompt/conversation/test-convo-123'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation/test-convo-123' \
    --method='GET'"
}

step4() {
    echo "4. Test error case - Missing required fields
Should return an error for missing modelId.

--path-template='/latest/services/prompt/conversation'
--method='POST'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"Tell me a joke\",
      \"modelSource\": \"bedrock\"
    }'"
}

step5() {
    echo "5. Test error case - Invalid model ID
Should return an error for an invalid model ID.

--path-template='/latest/services/prompt/conversation'
--method='POST'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"Tell me a joke\",
      \"modelId\": \"invalid-model\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-123\"
    }'"
}

step6() {
    echo "6. Test extended conversation with Claude as a pirate
Simulates a natural conversation flow with 6 exchanges to test system prompt and persona consistency.

--path-template='/latest/services/prompt/conversation'
--method='POST'
"
    # Start conversation with pirate persona
    echo "6.1 Starting pirate conversation..."
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"Tell me about modern AI technology\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-pirate\",
      \"systemPrompt\": \"You are a knowledgeable but quirky pirate who explains complex topics using pirate terminology. Always speak in pirate dialect, use nautical metaphors, and maintain your pirate personality throughout the conversation. Never break character.\"
    }'"
    sleep 2

    # Follow-up about specific AI component
    echo "6.2 Asking about neural networks..."
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"Can you explain how neural networks work?\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-pirate\",
      \"systemPrompt\": \"You are a knowledgeable but quirky pirate who explains complex topics using pirate terminology. Always speak in pirate dialect, use nautical metaphors, and maintain your pirate personality throughout the conversation. Never break character.\"
    }'"
    sleep 2

    # Technical question to test persona maintenance
    echo "6.3 Asking about deep learning..."
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"What's the difference between deep learning and traditional machine learning?\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-pirate\",
      \"systemPrompt\": \"You are a knowledgeable but quirky pirate who explains complex topics using pirate terminology. Always speak in pirate dialect, use nautical metaphors, and maintain your pirate personality throughout the conversation. Never break character.\"
    }'"
    sleep 2

    # Practical application question
    echo "6.4 Asking about real-world applications..."
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"How are these technologies used in the real world?\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-pirate\",
      \"systemPrompt\": \"You are a knowledgeable but quirky pirate who explains complex topics using pirate terminology. Always speak in pirate dialect, use nautical metaphors, and maintain your pirate personality throughout the conversation. Never break character.\"
    }'"
    sleep 2

    # Challenge question to test complex explanation in character
    echo "6.5 Asking about challenges..."
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"What are the biggest challenges in implementing AI systems?\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-pirate\",
      \"systemPrompt\": \"You are a knowledgeable but quirky pirate who explains complex topics using pirate terminology. Always speak in pirate dialect, use nautical metaphors, and maintain your pirate personality throughout the conversation. Never break character.\"
    }'"
    sleep 2

    # Final summary to verify persona consistency
    echo "6.6 Requesting summary of discussion..."
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation' \
    --method='POST' \
    --body='{
      \"userPrompt\": \"Can you summarize everything we've discussed about AI?\",
      \"modelId\": \"anthropic.claude-3-5-sonnet-20240620-v1:0\",
      \"modelSource\": \"bedrock\",
      \"conversationId\": \"test-convo-pirate\",
      \"systemPrompt\": \"You are a knowledgeable but quirky pirate who explains complex topics using pirate terminology. Always speak in pirate dialect, use nautical metaphors, and maintain your pirate personality throughout the conversation. Never break character.\"
    }'"

    # Get final conversation history to verify persona consistency
    echo "6.7 Retrieving full conversation history..."
    sleep 1
    execute_command "$BASE_CMD \
    --path-template='/latest/services/prompt/conversation/test-convo-pirate' \
    --method='GET'"
}

# Execute all steps
run_step 1 step1
run_step 2 step2
run_step 3 step3
run_step 4 step4
run_step 5 step5
run_step 6 step6
