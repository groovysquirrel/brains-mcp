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
    echo "1. Get all models (should load defaults)

--path-template='/latest/resources/user/models'
--method='GET'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/models' \
    --method='GET'"
}

step2() {
    echo "2. Create initial model (200)
Creates first version of test-model with version 1.0.0

--path-template='/latest/resources/user/models'
--method='POST'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/models' \
    --method='POST' \
    --body='{
      \"operation\": \"create\",
      \"name\": \"test-model\",
      \"version\": \"1.0.0\",
      \"createdBy\": \"test-user\",
      \"content\": {
        \"dot\": \"digraph G { A -> B }\",
        \"markdown\": \"# Test Model\\n## Section 1\\nThis is a test model\"
      },
      \"tags\": [\"test\"]
    }'"
}

step3() {
    echo "3. Create second version (200)
Creates second version of test-model with version 1.0.1

--path-template='/latest/resources/user/models'
--method='POST'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/models' \
    --method='POST' \
    --body='{
      \"operation\": \"create\",
      \"name\": \"test-model\",
      \"version\": \"1.0.1\",
      \"createdBy\": \"test-user\",
      \"content\": {
        \"dot\": \"digraph G { A -> B -> C }\",
        \"markdown\": \"# Updated Test Model\\n## Section 1\\nThis is an updated test model\\n## Section 2\\nWith new content\"
      },
      \"tags\": [\"test\", \"updated\"]
    }'"
}

step4() {
    echo "4. Get all versions of the model (2 objects)
Should return both 1.0.0 and 1.0.1 versions

--path-template='/latest/resources/user/models/test-model/versions'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/models/test-model/versions' \
    --method='GET'"
}

step5() {
    echo "5. Get specific version (1.0.0)

--path-template='/latest/resources/user/models/test-model/1.0.0'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/models/test-model/1.0.0' \
    --method='GET'"
}

step6() {
    echo "6. Get latest version (should be 1.0.1)

--path-template='/latest/resources/user/models/test-model'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/models/test-model' \
    --method='GET'"
}

step7() {
    echo "7. Rename model

--path-template='/latest/resources/user/models'
--method='POST'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/models' \
    --method='POST' \
    --body='{
      \"operation\": \"rename\",
      \"name\": \"test-model\",
      \"newName\": \"renamed-test-model\"
    }'"
}

step8() {
    echo "8. Verify renamed model exists

--path-template='/latest/resources/user/models/renamed-test-model'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/models/renamed-test-model' \
    --method='GET'"
}

step9() {
    echo "9. Delete specific version (1.0.0)

--path-template='/latest/resources/user/models'
--method='POST'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/models' \
    --method='POST' \
    --body='{
      \"operation\": \"delete\",
      \"name\": \"renamed-test-model\",
      \"version\": \"1.0.0\"
    }'"
}

step10() {
    echo "10. Verify version was deleted (should only show 1.0.1)

--path-template='/latest/resources/user/models/renamed-test-model/versions'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/models/renamed-test-model/versions' \
    --method='GET'"
}

# Execute all steps
run_step 1 step1
run_step 2 step2
run_step 3 step3
run_step 4 step4
run_step 5 step5
run_step 6 step6
run_step 7 step7
run_step 8 step8
run_step 9 step9
run_step 10 step10
