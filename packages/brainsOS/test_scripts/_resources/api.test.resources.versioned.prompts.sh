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
    echo "1. Get all prompts (should load defaults) (4 objects)

--path-template='/latest/resources/user/prompts'
--method='GET'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/prompts' \
    --method='GET'"
}

step2() {
    echo "2. Create initial prompt (200)
Creates first version of test-prompt with version 1.0.0

--path-template='/latest/resources/user/prompts'
--method='POST'
--body='{
  \"operation\": \"create\",
  \"name\": \"test-prompt\",
  \"version\": \"1.0.0\"
  ...
}'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/prompts' \
    --method='POST' \
    --body='{
      \"operation\": \"create\",
      \"name\": \"test-prompt\",
      \"version\": \"1.0.0\",
      \"createdBy\": \"test-user\",
      \"content\": {
        \"prompt\": \"Initial version\",
        \"defaultModel\": \"gpt-4\"
      },
      \"tags\": [\"test\"]
    }'"
}

step3() {
    echo "3. Create second version (200)
Creates second version of test-prompt with version 1.0.1

--path-template='/latest/resources/user/prompts'
--method='POST'
--body='{
  \"operation\": \"create\",
  \"name\": \"test-prompt\",
  \"version\": \"1.0.1\"
  ...
}'
"
    eval "$BASE_CMD \
    --path-template='/latest/resources/user/prompts' \
    --method='POST' \
    --body='{
      \"operation\": \"create\",
      \"name\": \"test-prompt\",
      \"version\": \"1.0.1\",
      \"createdBy\": \"test-user\",
      \"content\": {
        \"prompt\": \"Second version\",
        \"defaultModel\": \"gpt-4\"
      },
      \"tags\": [\"test\"]
    }'"
}

step4() {
    echo "4. Get all versions of the prompt (2 objects)
Should return both 1.0.0 and 1.0.1 versions

--path-template='/latest/resources/user/prompts/test-prompt/versions'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts/test-prompt/versions' \
    --method='GET'"
}

step5() {
    echo "5. Get specific version (1.0.0)
Should return only version 1.0.0 of test-prompt

--path-template='/latest/resources/user/prompts/test-prompt/1.0.0'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts/test-prompt/1.0.0' \
    --method='GET'"
}

step6() {
    echo "6. Rename prompt
Renames test-prompt to renamed-prompt

--path-template='/latest/resources/user/prompts'
--method='POST'
--body='{
  \"operation\": \"rename\",
  \"name\": \"test-prompt\",
  \"newName\": \"renamed-prompt\"
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts' \
    --method='POST' \
    --body='{
      \"operation\": \"rename\",
      \"name\": \"test-prompt\",
      \"newName\": \"renamed-prompt\"
    }'"
}

step7() {
    echo "7. Verify renamed prompt exists
Should return the prompt with new name

--path-template='/latest/resources/user/prompts/renamed-prompt'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts/renamed-prompt' \
    --method='GET'"
}

step8() {
    echo "8. Verify old name returns 404
Should fail to find test-prompt

--path-template='/latest/resources/user/prompts/test-prompt'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts/test-prompt' \
    --method='GET'"
}

step9() {
    echo "9. Create new version of renamed prompt
Creates version 1.0.2 of renamed-prompt

--path-template='/latest/resources/user/prompts'
--method='POST'
--body='{
  \"operation\": \"create\",
  \"name\": \"renamed-prompt\",
  \"version\": \"1.0.2\"
  ...
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts' \
    --method='POST' \
    --body='{
      \"operation\": \"create\",
      \"name\": \"renamed-prompt\",
      \"version\": \"1.0.2\",
      \"createdBy\": \"test-user\",
      \"content\": {
        \"prompt\": \"Third version after rename\",
        \"defaultModel\": \"gpt-4\"
      },
      \"tags\": [\"test\"]
    }'"
}

step10() {
    echo "10. Get versions of renamed prompt
Should show all versions (1.0.0, 1.0.1, 1.0.2)

--path-template='/latest/resources/user/prompts/renamed-prompt/versions'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts/renamed-prompt/versions' \
    --method='GET'"
}

step11() {
    echo "11. Delete specific version
Deletes version 1.0.1 of renamed-prompt

--path-template='/latest/resources/user/prompts'
--method='POST'
--body='{
  \"operation\": \"delete\",
  \"name\": \"renamed-prompt\",
  \"version\": \"1.0.1\"
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts' \
    --method='POST' \
    --body='{
      \"operation\": \"delete\",
      \"name\": \"renamed-prompt\",
      \"version\": \"1.0.1\"
    }'"
}

step12() {
    echo "12. Verify remaining versions
Should show versions 1.0.0 and 1.0.2 only

--path-template='/latest/resources/user/prompts/renamed-prompt/versions'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts/renamed-prompt/versions' \
    --method='GET'"
}

step13() {
    echo "13. Delete all versions
Deletes all versions of renamed-prompt

--path-template='/latest/resources/user/prompts'
--method='POST'
--body='{
  \"operation\": \"delete\",
  \"name\": \"renamed-prompt\"
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts' \
    --method='POST' \
    --body='{
      \"operation\": \"delete\",
      \"name\": \"renamed-prompt\"
    }'"
}

step14() {
    echo "14. Verify prompt is completely deleted
Should return 404

--path-template='/latest/resources/user/prompts/renamed-prompt'
--method='GET'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/resources/user/prompts/renamed-prompt' \
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
run_step 11 step11
run_step 12 step12
run_step 13 step13
run_step 14 step14