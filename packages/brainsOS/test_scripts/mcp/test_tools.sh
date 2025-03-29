#!/bin/bash

# Source test utilities
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/test_utils.sh"

# Validate environment variables
validate_env

# Get base command
BASE_CMD=$(get_base_cmd)

echo "🧪 Testing MCP Tools..."

# Test Calculator Tool
test_calculator() {
    echo "\n📝 Testing Calculator..."
    
    # Test addition
    echo "\n➡️  Testing addition..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/tools/calculator' \
        --method='POST' \
        --body='{\"operation\":\"add\",\"a\":5,\"b\":3}'")
    assert_contains "$result" "\"result\":8"
    
    # Test subtraction
    echo "\n➡️  Testing subtraction..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/tools/calculator' \
        --method='POST' \
        --body='{\"operation\":\"subtract\",\"a\":10,\"b\":4}'")
    assert_contains "$result" "\"result\":6"
    
    # Test multiplication
    echo "\n➡️  Testing multiplication..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/tools/calculator' \
        --method='POST' \
        --body='{\"operation\":\"multiply\",\"a\":6,\"b\":7}'")
    assert_contains "$result" "\"result\":42"
    
    # Test division
    echo "\n➡️  Testing division..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/tools/calculator' \
        --method='POST' \
        --body='{\"operation\":\"divide\",\"a\":15,\"b\":3}'")
    assert_contains "$result" "\"result\":5"
    
    # Test division by zero
    echo "\n➡️  Testing division by zero (should error)..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/tools/calculator' \
        --method='POST' \
        --body='{\"operation\":\"divide\",\"a\":10,\"b\":0}'")
    assert_contains "$result" "error"
}

# Test Random Number Generator
test_random_number() {
    echo "\n📝 Testing Random Number Generator..."
    
    # Test random number generation
    echo "\n➡️  Testing random number in range..."
    result=$(execute_command "$BASE_CMD \
        --path-template='$MCP_BASE_PATH/tools/random' \
        --method='POST' \
        --body='{\"min\":1,\"max\":10}'")
    
    # Extract number from result
    number=$(echo "$result" | grep -o '"result":[0-9]*' | cut -d':' -f2)
    
    # Verify number is within range
    if [ "$number" -ge 1 ] && [ "$number" -le 10 ]; then
        echo "✅ Random number $number is within range"
    else
        echo "❌ Random number $number is outside range"
        exit 1
    fi
}

# Run tests
test_calculator
test_random_number

echo "\n✨ All tool tests completed successfully!" 