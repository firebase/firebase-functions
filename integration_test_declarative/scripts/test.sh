#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

SUITE_NAME="${1:-v1_firestore}"

echo -e "${GREEN}🧪 Running tests for suite: $SUITE_NAME${NC}"

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
METADATA_FILE="$ROOT_DIR/generated/.metadata.json"
TESTS_DIR="$ROOT_DIR/tests"

# Check if metadata exists
if [ ! -f "$METADATA_FILE" ]; then
  echo -e "${RED}❌ Metadata file not found. Run generation and deployment first.${NC}"
  exit 1
fi

# Extract TEST_RUN_ID from metadata
TEST_RUN_ID=$(grep '"testRunId"' "$METADATA_FILE" | cut -d'"' -f4)
PROJECT_ID=$(grep '"projectId"' "$METADATA_FILE" | cut -d'"' -f4)

echo -e "${GREEN}📋 Test configuration:${NC}"
echo "   TEST_RUN_ID: $TEST_RUN_ID"
echo "   PROJECT_ID: $PROJECT_ID"
echo "   SUITE: $SUITE_NAME"

# Export environment variables for tests
export TEST_RUN_ID
export PROJECT_ID

# Install test dependencies if needed
if [ ! -d "$TESTS_DIR/node_modules" ]; then
  echo -e "${YELLOW}📦 Installing test dependencies...${NC}"
  cd "$TESTS_DIR"
  npm install
  cd -
fi

# Run the Jest tests
echo -e "${YELLOW}🧪 Running Jest tests...${NC}"
cd "$TESTS_DIR"

# Map suite name to test file
case "$SUITE_NAME" in
  v1_firestore)
    TEST_FILE="v1/firestore.test.js"
    ;;
  *)
    echo -e "${RED}❌ Unknown suite: $SUITE_NAME${NC}"
    exit 1
    ;;
esac

# Run the tests
npm test -- "$TEST_FILE"

echo -e "${GREEN}✅ Tests completed!${NC}"