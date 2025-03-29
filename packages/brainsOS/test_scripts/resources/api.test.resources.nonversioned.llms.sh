#!/bin/bash

# Source test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/mcp/test_utils.sh"

# usage
#./test-resources-api.sh        # Run all steps
#./test-resources-api.sh -5     # Start from step 5

# Parse starting step argument
START_STEP=1
if [[ $1 =~ ^-([0-9]+)$ ]]; then
    START_STEP=${BASH_REMATCH[1]}
    echo "Starting from step $START_STEP"
fi

# Validate environment variables
validate_env

# Get base command
BASE_CMD=$(get_base_cmd)

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
    echo "1. Get LLMs (should load defaults) (4 objects)
    Asks for LLMs from the system data store, which is allowed.

--path-template='/latest/resources/system/llms' \
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/system/llms' \
    --method='GET'"
}

step2() {
    echo "2. Get LLMs (user) - should reject
Asks for LLMs from the user data store, which is not allowed.

--path-template='/latest/resources/user/llms/' \
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/llms/' \
    --method='GET'"
}

# Execute all steps
run_step 1 step1
run_step 2 step2