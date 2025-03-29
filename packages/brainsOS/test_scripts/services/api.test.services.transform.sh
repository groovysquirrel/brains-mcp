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
    echo "1. Test markdown to object transformation"
    
    local markdown_content="# Reference Architecture for Legal Services

## VS1: Business Development and Marketing
### L1: Market Analysis
- Researching and understanding market trends, client needs, and competitive landscape.
#### L2: Competitor Analysis
- Identifying and analyzing key competitors and their strategies.
#### L2: Market Segmentation
- Dividing the market into distinct groups based on characteristics like industry, size, or needs."

    # Properly escape the content for JSON
    local escaped_content=$(echo "$markdown_content" | jq -Rs .)
    
    local request_body="{\"content\": ${escaped_content}}"

    execute_command "$BASE_CMD \
    --path-template='/latest/services/transform/itrg-bra/markdown/object' \
    --method='POST' \
    --body='${request_body}'"
}

step2() {
    echo "2. Test chained transformation (markdown to dot)

--path-template='/latest/services/transform/itrg-bra/markdown/dot'
--method='POST'
--body='{
  \"content\": \"# Reference Architecture for Legal Services\\n\\n## VS2: Client Intake and Onboarding\\n### L1: Conflict Checking\\n- Ensuring no conflicts of interest exist before accepting new clients.\\n#### L2: Conflict Checking Sub 1\\n- A sample level 2 capablity.\\n#### L2: Conflict Checking Sub 2\\n- A sample level 2 capablity.\"
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/transform/itrg-bra/markdown/dot' \
    --method='POST' \
    --body='{
      \"content\": \"# Reference Architecture for Legal Services\\n\\n## VS2: Client Intake and Onboarding\\n### L1: Conflict Checking\\n- Ensuring no conflicts of interest exist before accepting new clients.\\n#### L2: Conflict Checking Sub 1\\n- A sample level 2 capablity.\\n#### L2: Conflict Checking Sub 2\\n- A sample level 2 capablity.\"
    }'"
}

step3() {
    echo "3. Test object to CSV transformation

--path-template='/latest/services/transform/itrg-bra/object/csv'
--method='POST'
--body='{
  \"content\": {
    \"definingCapabilities\": {
      \"valueStreams\": [{
        \"name\": \"Business Development and Marketing\",
        \"level1Capabilities\": [{
          \"name\": \"Market Analysis\",
          \"description\": \"Researching and understanding market trends, client needs, and competitive landscape.\",
          \"level2Capabilities\": [{
            \"name\": \"Competitor Analysis\",
            \"description\": \"Identifying and analyzing key competitors and their strategies.\"
          }, {
            \"name\": \"Market Segmentation\",
            \"description\": \"Dividing the market into distinct groups based on characteristics like industry, size, or needs.\"
          }]
        }]
      }]
    },
    \"sharedCapabilities\": [],
    \"enablingCapabilities\": []
  }
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/transform/itrg-bra/object/csv' \
    --method='POST' \
    --body='{
      \"content\": {
        \"definingCapabilities\": {
          \"valueStreams\": [{
            \"name\": \"Business Development and Marketing\",
            \"level1Capabilities\": [{
              \"name\": \"Market Analysis\",
              \"description\": \"Researching and understanding market trends, client needs, and competitive landscape.\",
              \"level2Capabilities\": [{
                \"name\": \"Competitor Analysis\",
                \"description\": \"Identifying and analyzing key competitors and their strategies.\"
              }, {
                \"name\": \"Market Segmentation\",
                \"description\": \"Dividing the market into distinct groups based on characteristics like industry, size, or needs.\"
              }]
            }]
          }]
        },
        \"sharedCapabilities\": [],
        \"enablingCapabilities\": []
      }
    }'"
}

step4() {
    echo "4. Test invalid transformation path (should return 404)

--path-template='/latest/services/transform/itrg-bra/dot/markdown'
--method='POST'
--body='{
  \"content\": \"digraph { ... }\"
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/transform/itrg-bra/dot/markdown' \
    --method='POST' \
    --body='{
      \"content\": \"digraph { A -> B }\"
    }'"
}

step5() {
    echo "5. Test invalid object type (should return 404)

--path-template='/latest/services/transform/invalid-type/markdown/object'
--method='POST'
--body='{
  \"content\": \"# Test\"
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/transform/invalid-type/markdown/object' \
    --method='POST' \
    --body='{
      \"content\": \"# Test\"
    }'"
}

step6() {
    echo "6. Test invalid input format (should return 400)

--path-template='/latest/services/transform/itrg-bra/markdown/object'
--method='POST'
--body='{
  \"content\": null
}'
"
    execute_command "$BASE_CMD \
    --path-template='/latest/services/transform/itrg-bra/markdown/object' \
    --method='POST' \
    --body='{
      \"content\": null
    }'"
}

# Execute all steps
run_step 1 step1
run_step 2 step2
run_step 3 step3
run_step 4 step4
run_step 5 step5
run_step 6 step6
