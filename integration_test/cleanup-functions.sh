#!/bin/bash

# Script to manage Firebase Functions for a specific test run
# Usage: ./cleanup-functions.sh <test_run_id> [list|count|delete]

if [ $# -lt 1 ]; then
    echo "Usage: $0 <test_run_id> [list|count|delete]"
    echo "  test_run_id: The test run ID (e.g., t1756484284414)"
    echo "  action: list (default), count, or delete"
    exit 1
fi

TEST_RUN_ID="$1"
ACTION="${2:-list}"
PROJECT_ID="functions-integration-tests"

echo "Managing functions for test run: $TEST_RUN_ID"
echo "Project: $PROJECT_ID"
echo "Action: $ACTION"
echo "---"

# Extract function names for the test run
FUNCTIONS=$(firebase functions:list --project "$PROJECT_ID" | grep "$TEST_RUN_ID" | cut -d'│' -f2 | sed 's/ //g' | grep -v "^$")

if [ -z "$FUNCTIONS" ]; then
    echo "No functions found for test run ID: $TEST_RUN_ID"
    exit 0
fi

# Count functions
FUNCTION_COUNT=$(echo "$FUNCTIONS" | wc -l | tr -d ' ')

case $ACTION in
    "list")
        echo "Found $FUNCTION_COUNT functions for test run $TEST_RUN_ID:"
        echo "$FUNCTIONS" | nl
        ;;
    "count")
        echo "Found $FUNCTION_COUNT functions for test run $TEST_RUN_ID"
        ;;
    "delete")
        echo "Deleting $FUNCTION_COUNT functions for test run $TEST_RUN_ID..."
        echo "$FUNCTIONS" | tr '\n' ' ' | xargs firebase functions:delete --project "$PROJECT_ID" --force
        echo "Cleanup completed!"
        ;;
    *)
        echo "Invalid action: $ACTION"
        echo "Valid actions: list, count, delete"
        exit 1
        ;;
esac
