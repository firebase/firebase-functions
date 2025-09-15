#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🧹 Starting cleanup...${NC}"

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
METADATA_FILE="$ROOT_DIR/generated/.metadata.json"

# Check if metadata exists
if [ ! -f "$METADATA_FILE" ]; then
  echo -e "${YELLOW}⚠️  No metadata file found. Nothing to clean up.${NC}"
  exit 0
fi

# Extract info from metadata
TEST_RUN_ID=$(grep '"testRunId"' "$METADATA_FILE" | cut -d'"' -f4)
PROJECT_ID=$(grep '"projectId"' "$METADATA_FILE" | cut -d'"' -f4)

echo -e "${GREEN}📋 Cleanup configuration:${NC}"
echo "   TEST_RUN_ID: $TEST_RUN_ID"
echo "   PROJECT_ID: $PROJECT_ID"

# Delete deployed functions
echo -e "${YELLOW}🗑️  Deleting functions with TEST_RUN_ID: $TEST_RUN_ID${NC}"

# Get list of functions to delete
FUNCTIONS=$(firebase functions:list --project "$PROJECT_ID" | grep "$TEST_RUN_ID" | awk '{print $1}' || true)

if [ -z "$FUNCTIONS" ]; then
  echo -e "${YELLOW}No functions found with TEST_RUN_ID: $TEST_RUN_ID${NC}"
else
  for FUNCTION in $FUNCTIONS; do
    echo "   Deleting function: $FUNCTION"
    firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --force || true
  done
fi

# Clean up test data from Firestore
echo -e "${YELLOW}🗑️  Cleaning up Firestore test data...${NC}"

# Delete test collections
for COLLECTION in firestoreDocumentOnCreateTests firestoreDocumentOnDeleteTests firestoreDocumentOnUpdateTests firestoreDocumentOnWriteTests; do
  firebase firestore:delete "$COLLECTION/$TEST_RUN_ID" --project "$PROJECT_ID" --yes 2>/dev/null || true
done

# Clean up generated files
echo -e "${YELLOW}🗑️  Cleaning up generated files...${NC}"
rm -rf "$ROOT_DIR/generated"/*

echo -e "${GREEN}✅ Cleanup complete!${NC}"