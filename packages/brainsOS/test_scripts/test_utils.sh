#!/bin/bash

# Load environment variables from config file
CONFIG_FILE=".env.test"
if [ -f "$CONFIG_FILE" ]; then
    source "$CONFIG_FILE"
else
    echo "⚠️  No config file found. Using defaults or environment variables."
fi

# Required environment variables with defaults
: "${API_STAGE:=dev}"
: "${API_VERSION:=latest}"
: "${API_BASE_URL:=https://dev-api.brains.patternsatscale.com}"
: "${API_ADDITIONAL_PARAMS:='{\"queryParams\":{\"flatten\":\"true\"}}'}"
: "${TEST_TIMEOUT:=5000}"
: "${RETRY_ATTEMPTS:=3}"
: "${LOG_LEVEL:=info}"

# Authentication parameters (should be set in .env.test or CI/CD)
: "${COGNITO_USERNAME:=}"
: "${COGNITO_PASSWORD:=}"
: "${USER_POOL_ID:=}"
: "${APP_CLIENT_ID:=}"
: "${COGNITO_REGION:=us-east-1}"
: "${IDENTITY_POOL_ID:=}"
: "${API_GATEWAY_REGION:=us-east-1}"

# Security configurations
: "${TOKEN_REFRESH_INTERVAL:=3600}"  # 1 hour in seconds
: "${RATE_LIMIT_DELAY:=1}"          # 1 second between API calls
: "${MAX_TOKEN_AGE:=28800}"         # 8 hours in seconds

# Token management
TOKEN_FILE=$(mktemp)
TEMP_FILES+=("$TOKEN_FILE")
last_token_refresh=0
last_api_call=0

# Rate limiting function
rate_limit() {
    current_time=$(date +%s)
    time_passed=$((current_time - last_api_call))
    if [ $time_passed -lt $RATE_LIMIT_DELAY ]; then
        sleep $((RATE_LIMIT_DELAY - time_passed))
    fi
    last_api_call=$(date +%s)
}

# Token management
check_token_expiry() {
    current_time=$(date +%s)
    if [ $((current_time - last_token_refresh)) -gt $TOKEN_REFRESH_INTERVAL ]; then
        log "info" "Token refresh needed"
        return 1
    fi
    return 0
}

refresh_token() {
    if ! check_token_expiry; then
        log "info" "Refreshing authentication token..."
        # Add token refresh logic here if needed
        last_token_refresh=$(date +%s)
    fi
}

# Enhanced validation functions
validate_url() {
    local url=$1
    if [[ ! "$url" =~ ^https?:// ]]; then
        echo "❌ Invalid URL format: $url"
        echo "URLs must start with http:// or https://"
        return 1
    fi
}

validate_aws_region() {
    local region=$1
    if [[ ! "$region" =~ ^[a-z]{2}-[a-z]+-[0-9]{1}$ ]]; then
        echo "❌ Invalid AWS region format: $region"
        echo "Region must be in format: us-east-1"
        return 1
    fi
}

validate_user_pool_id() {
    local pool_id=$1
    if [[ ! "$pool_id" =~ ^[a-z0-9-]+_[A-Za-z0-9]+$ ]]; then
        echo "❌ Invalid User Pool ID format: $pool_id"
        echo "User Pool ID must be in format: region_poolid"
        return 1
    fi
}

validate_identity_pool_id() {
    local pool_id=$1
    if [[ ! "$pool_id" =~ ^[a-z]{2}-[a-z]+-[0-9]{1}:[0-9a-f-]+$ ]]; then
        echo "❌ Invalid Identity Pool ID format: $pool_id"
        echo "Identity Pool ID must be in format: region:uuid"
        return 1
    fi
}

validate_json_params() {
    local params=$1
    if ! echo "$params" | jq -e . >/dev/null 2>&1; then
        echo "❌ Invalid JSON format in API_ADDITIONAL_PARAMS"
        return 1
    fi
}

# Enhanced environment validation
validate_env() {
    local missing=()
    local invalid=()

    # Check required variables
    [[ -z "$COGNITO_USERNAME" ]] && missing+=("COGNITO_USERNAME")
    [[ -z "$COGNITO_PASSWORD" ]] && missing+=("COGNITO_PASSWORD")
    [[ -z "$USER_POOL_ID" ]] && missing+=("USER_POOL_ID")
    [[ -z "$APP_CLIENT_ID" ]] && missing+=("APP_CLIENT_ID")
    [[ -z "$IDENTITY_POOL_ID" ]] && missing+=("IDENTITY_POOL_ID")
    
    # Validate formats if variables are present
    [[ -n "$API_BASE_URL" ]] && ! validate_url "$API_BASE_URL" && invalid+=("API_BASE_URL")
    [[ -n "$COGNITO_REGION" ]] && ! validate_aws_region "$COGNITO_REGION" && invalid+=("COGNITO_REGION")
    [[ -n "$API_GATEWAY_REGION" ]] && ! validate_aws_region "$API_GATEWAY_REGION" && invalid+=("API_GATEWAY_REGION")
    [[ -n "$USER_POOL_ID" ]] && ! validate_user_pool_id "$USER_POOL_ID" && invalid+=("USER_POOL_ID")
    [[ -n "$IDENTITY_POOL_ID" ]] && ! validate_identity_pool_id "$IDENTITY_POOL_ID" && invalid+=("IDENTITY_POOL_ID")
    [[ -n "$API_ADDITIONAL_PARAMS" ]] && ! validate_json_params "$API_ADDITIONAL_PARAMS" && invalid+=("API_ADDITIONAL_PARAMS")
    
    # Report any missing variables
    if [ ${#missing[@]} -ne 0 ]; then
        echo "❌ Missing required environment variables:"
        printf '%s\n' "${missing[@]}"
        exit 1
    fi

    # Report any invalid formats
    if [ ${#invalid[@]} -ne 0 ]; then
        echo "❌ Invalid format in environment variables:"
        printf '%s\n' "${invalid[@]}"
        exit 1
    fi

    # Log success if everything is valid
    echo "✅ Environment validation passed"

    # Add warning for potentially sensitive data in parameters
    if [[ "$API_ADDITIONAL_PARAMS" =~ password|secret|key|token ]]; then
        echo "⚠️  WARNING: API_ADDITIONAL_PARAMS might contain sensitive data"
        exit 1
    fi

    # Check file permissions
    if [ -f "$CONFIG_FILE" ]; then
        file_perms=$(stat -f "%Lp" "$CONFIG_FILE")
        if [ "$file_perms" != "600" ]; then
            echo "⚠️  WARNING: $CONFIG_FILE has unsafe permissions: $file_perms (should be 600)"
            exit 1
        fi
    fi
}

# Add secure cleanup function
cleanup() {
    # Clear any sensitive variables
    COGNITO_USERNAME=""
    COGNITO_PASSWORD=""
    USER_POOL_ID=""
    APP_CLIENT_ID=""
    IDENTITY_POOL_ID=""
    
    # Remove any temporary files
    if [ -n "$TEMP_FILES" ]; then
        for file in "${TEMP_FILES[@]}"; do
            if [ -f "$file" ]; then
                dd if=/dev/urandom of="$file" bs=1k count=1 2>/dev/null  # Overwrite with random data
                rm -f "$file"
            fi
        done
    fi
    
    # Clear command history
    history -c 2>/dev/null || true
}

# Register cleanup on script exit
trap cleanup EXIT

# Base command builder with additional parameters
get_base_cmd() {
    echo "npx aws-api-gateway-cli-test \
    --username=\"$COGNITO_USERNAME\" \
    --password=\"$COGNITO_PASSWORD\" \
    --user-pool-id=\"$USER_POOL_ID\" \
    --app-client-id=\"$APP_CLIENT_ID\" \
    --cognito-region=\"$COGNITO_REGION\" \
    --identity-pool-id=\"$IDENTITY_POOL_ID\" \
    --invoke-url=\"$API_BASE_URL\" \
    --api-gateway-region=\"$API_GATEWAY_REGION\" \
    --additional-params='$API_ADDITIONAL_PARAMS'"
}

# Test utilities
assert_success() {
    if [ $? -eq 0 ]; then
        echo "✅ Test passed: $1"
    else
        echo "❌ Test failed: $1"
        exit 1
    fi
}

assert_contains() {
    if echo "$1" | grep -q "$2"; then
        echo "✅ Output contains expected value: $2"
    else
        echo "❌ Output missing expected value: $2"
        echo "Actual output: $1"
        exit 1
    fi
}

assert_status() {
    local expected_status=$1
    local actual_status=$2
    local message=$3
    if [ "$actual_status" -eq "$expected_status" ]; then
        echo "✅ Status check passed: $message"
    else
        echo "❌ Status check failed: Expected $expected_status, got $actual_status"
        exit 1
    fi
}

# Enhanced command execution with rate limiting and token refresh
execute_command() {
    local cmd="$1"
    local attempt=1
    local result=""
    
    # Check token before execution
    refresh_token
    
    # Apply rate limiting
    rate_limit
    
    echo "Executing: ${cmd//$COGNITO_PASSWORD/****}"  # Mask sensitive data in logs
    
    while [ $attempt -le $RETRY_ATTEMPTS ]; do
        if [ $attempt -gt 1 ]; then
            echo "🔄 Retry attempt $attempt of $RETRY_ATTEMPTS"
            sleep 2
        fi
        
        result=$(eval "$cmd")
        status=$?
        
        # Check for specific error conditions
        if echo "$result" | grep -q "TokenExpired"; then
            refresh_token
            result=$(eval "$cmd")
            status=$?
        fi
        
        if [ $status -eq 0 ]; then
            # Mask sensitive data in output
            masked_result=$(echo "$result" | sed 's/\(password\|secret\|key\|token\)[^,}]*[,}]/\1": "****"/g')
            echo "$masked_result"
            return 0
        fi
        
        attempt=$((attempt + 1))
    done
    
    echo "❌ Command failed after $RETRY_ATTEMPTS attempts"
    echo "${result//$COGNITO_PASSWORD/****}"  # Mask sensitive data in error output
    return 1
}

# Interactive pause/retry mechanism
LAST_COMMAND=""

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

# Log message with timestamp
log() {
    local level=$1
    local message=$2
    if [[ "$LOG_LEVEL" == "info" ]] || [[ "$level" == "error" ]]; then
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] [$level] $message"
    fi
}

# MCP specific paths
MCP_BASE_PATH="/$API_VERSION/mcp" 