#!/bin/bash

# Hard reset - removes ALL test functions and test data from Firebase
# USE WITH EXTREME CAUTION!

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${RED}⚠️  WARNING: HARD RESET - This will delete ALL test functions and data!${NC}"
echo -e "${RED}⚠️  This action cannot be undone!${NC}"
echo ""

# Check for PROJECT_ID
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ PROJECT_ID environment variable is required${NC}"
  echo "Usage: PROJECT_ID=your-test-project ./scripts/hard-reset.sh"
  exit 1
fi

echo -e "${YELLOW}Project: $PROJECT_ID${NC}"
echo ""
read -p "Are you ABSOLUTELY SURE you want to delete all test functions? (type 'yes' to confirm): " -r
echo

if [[ ! $REPLY == "yes" ]]; then
  echo -e "${GREEN}Cancelled - no changes made${NC}"
  exit 0
fi

echo -e "${YELLOW}🔥 Starting hard reset...${NC}"

# Delete all functions with test patterns in their names
echo -e "${YELLOW}🗑️  Deleting all test functions...${NC}"

# Common test function patterns
PATTERNS=(
  "_t_"           # TEST_RUN_ID pattern
  "Tests"         # Test function suffix
  "test"          # General test pattern
)

for PATTERN in "${PATTERNS[@]}"; do
  echo -e "${YELLOW}   Looking for functions matching: *${PATTERN}*${NC}"

  # Get list of matching functions
  FUNCTIONS=$(firebase functions:list --project "$PROJECT_ID" 2>/dev/null | grep -i "$PATTERN" | awk '{print $1}' || true)

  if [ -z "$FUNCTIONS" ]; then
    echo "   No functions found matching pattern: $PATTERN"
  else
    for FUNCTION in $FUNCTIONS; do
      echo "   Deleting function: $FUNCTION"
      firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --force 2>/dev/null || true
    done
  fi
done

# Clean up Firestore collections commonly used in tests
echo -e "${YELLOW}🗑️  Cleaning up Firestore test collections...${NC}"

TEST_COLLECTIONS=(
  "tests"
  "firestoreDocumentOnCreateTests"
  "firestoreDocumentOnDeleteTests"
  "firestoreDocumentOnUpdateTests"
  "firestoreDocumentOnWriteTests"
  "databaseRefOnCreateTests"
  "databaseRefOnDeleteTests"
  "databaseRefOnUpdateTests"
  "databaseRefOnWriteTests"
  "storageOnFinalizeTests"
  "storageOnMetadataUpdateTests"
  "pubsubOnPublishTests"
  "pubsubScheduleTests"
  "authUserOnCreateTests"
  "authUserOnDeleteTests"
  "authBeforeCreateTests"
  "authBeforeSignInTests"
  "httpsOnCallTests"
  "httpsOnRequestTests"
  "tasksOnDispatchTests"
  "testLabOnCompleteTests"
  "remoteConfigOnUpdateTests"
  "analyticsEventTests"
)

for COLLECTION in "${TEST_COLLECTIONS[@]}"; do
  echo "   Deleting collection: $COLLECTION"
  firebase firestore:delete "$COLLECTION" --project "$PROJECT_ID" --recursive --yes 2>/dev/null || true
done

# Clean up Realtime Database test paths
echo -e "${YELLOW}🗑️  Cleaning up Realtime Database test data...${NC}"

# Common test paths in RTDB
TEST_PATHS=(
  "dbTests"
  "testRuns"
  "tests"
)

for PATH in "${TEST_PATHS[@]}"; do
  echo "   Deleting RTDB path: /$PATH"
  firebase database:remove "/$PATH" --project "$PROJECT_ID" --force 2>/dev/null || true
done

# Clean up Storage test files
echo -e "${YELLOW}🗑️  Cleaning up Storage test files...${NC}"
# Note: This would require gsutil or Firebase Admin SDK
echo "   (Storage cleanup requires manual intervention or gsutil)"

# Clean up local generated files
echo -e "${YELLOW}🗑️  Cleaning up local generated files...${NC}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

if [ -d "$ROOT_DIR/generated" ]; then
  rm -rf "$ROOT_DIR/generated"/*
  echo "   Cleaned generated/ directory"
fi

echo -e "${GREEN}✅ Hard reset complete!${NC}"
echo -e "${GREEN}   All test functions and data have been removed from project: $PROJECT_ID${NC}"
echo ""
echo -e "${YELLOW}Note: Some resources may take a few moments to fully delete.${NC}"