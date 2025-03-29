#!/bin/bash

# Source test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test_utils.sh"

# Validate environment variables
validate_env

# Get base command
BASE_CMD=$(get_base_cmd)

echo "🧪 Testing MCP Resources..."

# Test Dog Names
test_dog_names() {
    echo "\n📝 Testing Dog Names..."
    
    echo "\n➡️  Fetching dog names..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/resources/dog-names' \
        --method='GET'")
    
    # Verify response contains expected data
    assert_contains "$result" "\"name\":"
    assert_contains "$result" "\"origin\":"
}

# Test Random Facts
test_random_facts() {
    echo "\n📝 Testing Random Facts..."
    
    echo "\n➡️  Fetching random facts..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/resources/random-facts' \
        --method='GET'")
    
    # Verify response contains expected data
    assert_contains "$result" "\"fact\":"
    assert_contains "$result" "\"category\":"
}

# Run tests
test_dog_names
test_random_facts

echo "\n✨ All resource tests completed successfully!" 