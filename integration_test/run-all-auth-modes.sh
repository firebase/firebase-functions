#!/usr/bin/env bash

# Script to run integration tests with all auth mode configurations
# This ensures both v1 auth and v2 identity blocking functions are tested

set -e

echo "========================================="
echo "Running Integration Tests - All Auth Modes"
echo "========================================="

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
  echo "Error: PROJECT_ID environment variable is not set"
  exit 1
fi

echo "Project ID: $PROJECT_ID"
echo ""

# Function to run tests with a specific auth mode
run_with_auth_mode() {
  local mode=$1
  local description=$2

  echo "========================================="
  echo "Running: $description"
  echo "Auth Mode: $mode"
  echo "========================================="

  export AUTH_TEST_MODE=$mode
  npm run start

  if [ $? -eq 0 ]; then
    echo "✅ $description completed successfully"
  else
    echo "❌ $description failed"
    exit 1
  fi

  echo ""
}

# Pass 1: Test with v1 auth blocking functions
run_with_auth_mode "v1_auth" "Pass 1 - v1 Auth Blocking Functions"

# Pass 2: Test with v2 identity blocking functions
run_with_auth_mode "v2_identity" "Pass 2 - v2 Identity Blocking Functions"

# Pass 3: Test without any blocking functions (optional, for other tests)
run_with_auth_mode "none" "Pass 3 - No Blocking Functions"

echo "========================================="
echo "✅ All auth mode tests completed successfully!"
echo "========================================="