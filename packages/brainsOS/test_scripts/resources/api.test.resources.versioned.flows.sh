#!/bin/bash

# usage
#./test-resources-flows-api.sh        # Run all steps
#./test-resources-flows-api.sh -5     # Start from step 5
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
    echo "1. Get all flows (should load defaults)

--path-template='/latest/resources/user/flows'
--method='GET'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/flows' \
    --method='GET'"
}

step2() {
    echo "2. Create initial flow (200)
Creates first version of test-flow with version 1.0.0

--path-template='/latest/resources/user/flows'
--method='POST'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/flows' \
    --method='POST' \
    --body='{
      \"operation\": \"create\",
      \"name\": \"test-flow\",
      \"version\": \"1.0.0\",
      \"createdBy\": \"test-user\",
      \"content\": {
        \"nodes\": [
          {
            \"id\": \"node1\",
            \"type\": \"input\",
            \"position\": { \"x\": 100, \"y\": 100 },
            \"data\": { \"prompt\": \"Initial test flow\" }
          }
        ],
        \"edges\": [],
        \"viewport\": { \"x\": 0, \"y\": 0, \"zoom\": 1 }
      },
      \"tags\": [\"test\"]
    }'"
}

step3() {
    echo "3. Create second version (200)
Creates second version of test-flow with version 1.0.1

--path-template='/latest/resources/user/flows'
--method='POST'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/flows' \
    --method='POST' \
    --body='{
      \"operation\": \"create\",
      \"name\": \"test-flow\",
      \"version\": \"1.0.1\",
      \"createdBy\": \"test-user\",
      \"content\": {
        \"nodes\": [
          {
            \"id\": \"node1\",
            \"type\": \"input\",
            \"position\": { \"x\": 100, \"y\": 100 },
            \"data\": { \"prompt\": \"Updated test flow\" }
          },
          {
            \"id\": \"node2\",
            \"type\": \"output\",
            \"position\": { \"x\": 300, \"y\": 100 },
            \"data\": { \"result\": \"New node\" }
          }
        ],
        \"edges\": [
          {
            \"id\": \"edge1\",
            \"source\": \"node1\",
            \"target\": \"node2\"
          }
        ],
        \"viewport\": { \"x\": 0, \"y\": 0, \"zoom\": 1 }
      },
      \"tags\": [\"test\", \"updated\"]
    }'"
}

step4() {
    echo "4. Get all versions of the flow (2 objects)
Should return both 1.0.0 and 1.0.1 versions

--path-template='/latest/resources/user/flows/test-flow/versions'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/flows/example-flow/versions' \
    --method='GET'"
}

# Add remaining steps following the same pattern as prompts...
# Steps 5-14 would be similar but with flow-specific content

# Execute all steps
run_step 1 step1
run_step 2 step2
run_step 3 step3
run_step 4 step4
# Add remaining step executions...
