#!/bin/bash

# Source test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test_utils.sh"

# Validate environment variables
validate_env

# Get base command
BASE_CMD=$(get_base_cmd)

echo "🧪 Testing MCP Prompts..."

# Test Joke Prompts
test_joke_prompts() {
    echo "\n📝 Testing Joke Prompts..."
    
    # Test dad jokes
    echo "\n➡️  Testing dad jokes..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/prompts/joke' \
        --method='POST' \
        --body='{\"type\":\"dad\"}'")
    assert_contains "$result" "\"content\":"
    
    # Test puns
    echo "\n➡️  Testing puns..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/prompts/joke' \
        --method='POST' \
        --body='{\"type\":\"pun\"}'")
    assert_contains "$result" "\"content\":"
    
    # Test general jokes
    echo "\n➡️  Testing general jokes..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/prompts/joke' \
        --method='POST' \
        --body='{\"type\":\"general\"}'")
    assert_contains "$result" "\"content\":"
}

# Test Rap Prompts
test_rap_prompts() {
    echo "\n📝 Testing Rap Prompts..."
    
    # Test old school style
    echo "\n➡️  Testing old school rap..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/prompts/rap' \
        --method='POST' \
        --body='{\"topic\":\"coding\",\"style\":\"old_school\"}'")
    assert_contains "$result" "\"content\":"
    
    # Test modern style
    echo "\n➡️  Testing modern rap..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/prompts/rap' \
        --method='POST' \
        --body='{\"topic\":\"coding\",\"style\":\"modern\"}'")
    assert_contains "$result" "\"content\":"
}

# Run tests
test_joke_prompts
test_rap_prompts

echo "\n✨ All prompt tests completed successfully!" 