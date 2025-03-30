#!/bin/bash

# usage
#./test_indexes.sh        # Run all steps
#./test_indexes.sh -3     # Start from step 3

# Parse starting step argument
START_STEP=1
if [[ $1 =~ ^-([0-9]+)$ ]]; then
    START_STEP=${BASH_REMATCH[1]}
    echo "Starting from step $START_STEP"
fi

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

# Test all services index
step1() {
    echo "1. Get all available MCP services
    Should return a list of all prompts, resources, and tools.

--path-template='/latest/mcp/index' \
--method='POST' \
--body='{}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/index' \
    --method='POST' \
    --body='{}'"
}

# Test prompts index
step2() {
    echo "2. Get available prompts
    Should return a list of all available prompts.

--path-template='/latest/mcp/index/prompts' \
--method='POST' \
--body='{}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/index/prompts' \
    --method='POST' \
    --body='{}'"
}

# Test resources index
step3() {
    echo "3. Get available resources
    Should return a list of all available resources.

--path-template='/latest/mcp/index/resources' \
--method='POST' \
--body='{}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/index/resources' \
    --method='POST' \
    --body='{}'"
}

# Test tools index
step4() {
    echo "4. Get available tools
    Should return a list of all available tools.

--path-template='/latest/mcp/index/tools' \
--method='POST' \
--body='{}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/index/tools' \
    --method='POST' \
    --body='{}'"
}

# Test invalid type
step5() {
    echo "5. Test invalid type
    Should return an error for invalid service type.

--path-template='/latest/mcp/index/invalid' \
--method='POST' \
--body='{}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/index/invalid' \
    --method='POST' \
    --body='{}'"
}

# Run all steps
run_step 1 step1
run_step 2 step2
run_step 3 step3
run_step 4 step4
run_step 5 step5

echo "All tests completed!" 