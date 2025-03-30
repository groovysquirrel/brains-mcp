#!/bin/bash

# usage
#./test_resources.sh        # Run all steps
#./test_resources.sh -5     # Start from step 5

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

# Dog Names Resource Tests
step1() {
    echo "1. Get 5 random dog names (any gender)
    Should return 5 random dog names with no gender preference.

--path-template='/latest/mcp/resources/dog-names' \
--method='POST' \
--body='{\"type\":\"dog-names\",\"query\":{}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/dog-names' \
    --method='POST' \
    --body='{\"type\":\"dog-names\",\"query\":{}}'"
}

step2() {
    echo "2. Get 3 random dog names (male)
    Should return 3 random male dog names.

--path-template='/latest/mcp/resources/dog-names' \
--method='POST' \
--body='{\"type\":\"dog-names\",\"query\":{\"count\":3,\"gender\":\"male\"}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/dog-names' \
    --method='POST' \
    --body='{\"type\":\"dog-names\",\"query\":{\"count\":3,\"gender\":\"male\"}}'"
}

step3() {
    echo "3. Get 2 random dog names (female)
    Should return 2 random female dog names.

--path-template='/latest/mcp/resources/dog-names' \
--method='POST' \
--body='{\"type\":\"dog-names\",\"query\":{\"count\":2,\"gender\":\"female\"}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/dog-names' \
    --method='POST' \
    --body='{\"type\":\"dog-names\",\"query\":{\"count\":2,\"gender\":\"female\"}}'"
}

step4() {
    echo "4. Get 3 random facts
    Should return 3 random facts.

--path-template='/latest/mcp/resources/random-facts' \
--method='POST' \
--body='{\"type\":\"random-facts\",\"query\":{\"count\":3}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/random-facts' \
    --method='POST' \
    --body='{\"type\":\"random-facts\",\"query\":{\"count\":3}}'"
}

step5() {
    echo "5. Test error handling - invalid count
    Should return an error for invalid count parameter.

--path-template='/latest/mcp/resources/dog-names' \
--method='POST' \
--body='{\"type\":\"dog-names\",\"query\":{\"count\":-1}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/dog-names' \
    --method='POST' \
    --body='{\"type\":\"dog-names\",\"query\":{\"count\":-1}}'"
}

# Random Facts Resource Tests
step6() {
    echo "6. Get 5 random facts
    Should return 5 random facts from any category.

--path-template='/latest/mcp/resources/random-facts' \
--method='POST' \
--body='{\"type\":\"random-facts\",\"query\":{}}' \
--additional-params='{\"queryParams\":{\"flatten\":\"true\"}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/random-facts' \
    --method='POST' \
    --body='{\"type\":\"random-facts\",\"query\":{}}' \
    --additional-params='{\"queryParams\":{\"flatten\":\"true\"}}'"
}

step7() {
    echo "7. Get 3 science facts
    Should return 3 random facts from the science category.

--path-template='/latest/mcp/resources/random-facts' \
--method='POST' \
--body='{\"type\":\"random-facts\",\"query\":{\"count\":3,\"category\":\"Science\"}}' \
--additional-params='{\"queryParams\":{\"flatten\":\"true\"}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/random-facts' \
    --method='POST' \
    --body='{\"type\":\"random-facts\",\"query\":{\"count\":3,\"category\":\"Science\"}}' \
    --additional-params='{\"queryParams\":{\"flatten\":\"true\"}}'"
}

step8() {
    echo "8. Test error handling (invalid count)
    Should return an error for count > 100.

--path-template='/latest/mcp/resources/random-facts' \
--method='POST' \
--body='{\"type\":\"random-facts\",\"query\":{\"count\":101}}' \
--additional-params='{\"queryParams\":{\"flatten\":\"true\"}}'"

    eval "$BASE_CMD \
    --path-template='/latest/mcp/resources/random-facts' \
    --method='POST' \
    --body='{\"type\":\"random-facts\",\"query\":{\"count\":101}}' \
    --additional-params='{\"queryParams\":{\"flatten\":\"true\"}}'"
}

# Run all steps
run_step 1 step1
run_step 2 step2
run_step 3 step3
run_step 4 step4
run_step 5 step5
run_step 6 step6
run_step 7 step7
run_step 8 step8

echo "All tests completed!" 