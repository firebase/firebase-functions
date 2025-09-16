#!/bin/bash

# Complete integration test runner for a single suite
# Usage: ./scripts/run-suite.sh <suite-name>

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check arguments
if [ $# -lt 1 ]; then
  echo -e "${RED}❌ At least one suite name required${NC}"
  echo "Usage: $0 <suite-name> [<suite-name> ...] [--save-artifact]"
  echo "Example: $0 v1_firestore"
  echo "         $0 v1_firestore v1_database"
  echo "         $0 v1_firestore v1_database --save-artifact"
  exit 1
fi

# Parse arguments - collect suite names and check for --save-artifact flag
SUITE_NAMES=()
SAVE_ARTIFACT=""
for arg in "$@"; do
  if [ "$arg" = "--save-artifact" ]; then
    SAVE_ARTIFACT="--save-artifact"
  else
    SUITE_NAMES+=("$arg")
  fi
done

# Join suite names for display
SUITE_DISPLAY="${SUITE_NAMES[*]}"

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Generate unique TEST_RUN_ID (short to avoid 63-char function name limit)
# No underscores or hyphens - just letters and numbers for compatibility with both JS identifiers and Cloud Tasks
export TEST_RUN_ID="t$(head -c 8 /dev/urandom | base64 | tr -d '/+=' | tr '[:upper:]' '[:lower:]' | head -c 8)"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Running Integration Test Suite(s): ${SUITE_DISPLAY}${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📋 Test Run ID: ${TEST_RUN_ID}${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
  local exit_code=$?
  echo ""
  echo -e "${YELLOW}🧹 Running cleanup...${NC}"

  # Check if metadata exists
  if [ -f "$ROOT_DIR/generated/.metadata.json" ]; then
    # Extract project ID from metadata
    PROJECT_ID=$(grep '"projectId"' "$ROOT_DIR/generated/.metadata.json" | cut -d'"' -f4)

    if [ -n "$PROJECT_ID" ]; then
      # Delete deployed functions using metadata
      echo -e "${YELLOW}   Deleting functions with TEST_RUN_ID: $TEST_RUN_ID${NC}"

      # Extract function names from metadata (handles both underscore and no-separator patterns)
      # Matches functions ending with either _testRunId or just testRunId
      FUNCTIONS=$(grep -oE '"[^"]*[_]?'${TEST_RUN_ID}'"' "$ROOT_DIR/generated/.metadata.json" 2>/dev/null | tr -d '"' || true)

      if [ -n "$FUNCTIONS" ]; then
        # Default region if not found in metadata
        REGION="us-central1"

        for FUNCTION in $FUNCTIONS; do
          echo "   Deleting function: $FUNCTION"
          # Try Firebase CLI first
          if ! firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --region "$REGION" --force 2>/dev/null; then
            # If Firebase CLI fails (e.g., due to invalid queue names), try gcloud
            echo "   Firebase CLI failed, trying gcloud..."
            gcloud functions delete "$FUNCTION" --region="$REGION" --project="$PROJECT_ID" --quiet 2>/dev/null || true
          fi
        done
      fi

      # Clean up test data from Firestore
      echo -e "${YELLOW}   Cleaning up Firestore test data...${NC}"
      for COLLECTION in firestoreDocumentOnCreateTests firestoreDocumentOnDeleteTests firestoreDocumentOnUpdateTests firestoreDocumentOnWriteTests; do
        firebase firestore:delete "$COLLECTION/$TEST_RUN_ID" --project "$PROJECT_ID" --yes 2>/dev/null || true
      done

      # Clean up auth test data from Firestore
      for COLLECTION in authUserOnCreateTests authUserOnDeleteTests authBeforeCreateTests authBeforeSignInTests; do
        firebase firestore:delete "$COLLECTION/$TEST_RUN_ID" --project "$PROJECT_ID" --yes 2>/dev/null || true
      done

      # Clean up auth users created during tests
      echo -e "${YELLOW}   Cleaning up auth test users...${NC}"
      node "$SCRIPT_DIR/cleanup-auth-users.cjs" "$TEST_RUN_ID" 2>/dev/null || true
    fi
  fi

  # Clean up generated files
  echo -e "${YELLOW}   Cleaning up generated files...${NC}"
  rm -rf "$ROOT_DIR/generated"/*

  if [ $exit_code -eq 0 ]; then
    echo -e "${GREEN}✅ All tests passed and cleanup complete!${NC}"
  else
    echo -e "${RED}❌ Tests failed. Cleanup complete.${NC}"
  fi

  exit $exit_code
}

# Set trap to run cleanup on exit
trap cleanup EXIT INT TERM

# Step 1: Generate functions
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}📦 Step 1/4: Generating functions${NC}"
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"

cd "$ROOT_DIR"
npm run generate "${SUITE_NAMES[@]}"

# Extract project ID from metadata
METADATA_FILE="$ROOT_DIR/generated/.metadata.json"
if [ ! -f "$METADATA_FILE" ]; then
  echo -e "${RED}❌ Metadata file not found after generation${NC}"
  exit 1
fi

PROJECT_ID=$(grep '"projectId"' "$METADATA_FILE" | cut -d'"' -f4)
export PROJECT_ID

echo ""
echo -e "${GREEN}✓ Functions generated for project: ${PROJECT_ID}${NC}"

# Save artifact if requested
if [ "$SAVE_ARTIFACT" == "--save-artifact" ]; then
  ARTIFACTS_DIR="$ROOT_DIR/.test-artifacts"
  mkdir -p "$ARTIFACTS_DIR"
  cp "$METADATA_FILE" "$ARTIFACTS_DIR/${TEST_RUN_ID}.json"
  echo -e "${GREEN}✓ Saved artifact for future cleanup: ${TEST_RUN_ID}.json${NC}"
fi

# Step 2: Build functions
echo ""
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}🔨 Step 2/4: Building functions${NC}"
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"

cd "$ROOT_DIR/generated/functions"

# Update package.json to use published version if local tarball doesn't exist
if ! [ -f "../../firebase-functions-local.tgz" ]; then
  echo "   Using published firebase-functions package"
  sed -i.bak 's|"firebase-functions": "file:../../firebase-functions-local.tgz"|"firebase-functions": "^4.5.0"|' package.json
  rm package.json.bak
fi

npm install
npm run build

echo -e "${GREEN}✓ Functions built successfully${NC}"

# Step 3: Deploy functions
echo ""
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}☁️  Step 3/4: Deploying to Firebase${NC}"
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"

cd "$ROOT_DIR/generated"
firebase deploy --only functions --project "$PROJECT_ID" || {
  # Check if it's just the cleanup policy warning
  if firebase functions:list --project "$PROJECT_ID" 2>/dev/null | grep -q "$TEST_RUN_ID"; then
    echo -e "${YELLOW}⚠️  Functions deployed with warnings (cleanup policy)${NC}"
  else
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
  fi
}

echo -e "${GREEN}✓ Functions deployed successfully${NC}"

# Step 4: Run tests
echo ""
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}🧪 Step 4/4: Running tests${NC}"
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"

cd "$ROOT_DIR"

# Check if service account exists
if [ ! -f "$ROOT_DIR/sa.json" ]; then
  echo -e "${YELLOW}⚠️  Warning: sa.json not found. Tests may fail without proper authentication.${NC}"
  echo -e "${YELLOW}   Please ensure you have proper Firebase credentials configured.${NC}"
fi

# Run the tests
export GOOGLE_APPLICATION_CREDENTIALS="$ROOT_DIR/sa.json"

# Collect test files for all suites
TEST_FILES=()
for SUITE_NAME in "${SUITE_NAMES[@]}"; do
  case "$SUITE_NAME" in
    v1_firestore)
      TEST_FILES+=("tests/v1/firestore.test.ts")
      ;;
    v1_database)
      TEST_FILES+=("tests/v1/database.test.ts")
      ;;
    v1_pubsub)
      TEST_FILES+=("tests/v1/pubsub.test.ts")
      ;;
    v1_storage)
      TEST_FILES+=("tests/v1/storage.test.ts")
      ;;
    v1_tasks)
      TEST_FILES+=("tests/v1/tasks.test.ts")
      ;;
    v1_remoteconfig)
      TEST_FILES+=("tests/v1/remoteconfig.test.ts")
      ;;
    v1_testlab)
      TEST_FILES+=("tests/v1/testlab.test.ts")
      ;;
    v1_auth | v1_auth_nonblocking | v1_auth_before_create | v1_auth_before_signin)
      TEST_FILES+=("tests/v1/auth.test.ts")
      ;;
    v2_database)
      TEST_FILES+=("tests/v2/database.test.ts")
      ;;
    v2_pubsub)
      TEST_FILES+=("tests/v2/pubsub.test.ts")
      ;;
    v2_storage)
      TEST_FILES+=("tests/v2/storage.test.ts")
      ;;
    v2_tasks)
      TEST_FILES+=("tests/v2/tasks.test.ts")
      ;;
    v2_scheduler)
      TEST_FILES+=("tests/v2/scheduler.test.ts")
      ;;
    v2_remoteconfig)
      TEST_FILES+=("tests/v2/remoteconfig.test.ts")
      ;;
    v2_testlab)
      TEST_FILES+=("tests/v2/testlab.test.ts")
      ;;
    v2_identity)
      TEST_FILES+=("tests/v2/identity.test.ts")
      ;;
    v2_eventarc)
      TEST_FILES+=("tests/v2/eventarc.test.ts")
      ;;
    v2_firestore)
      TEST_FILES+=("tests/v2/firestore.test.ts")
      ;;
    *)
      echo -e "${YELLOW}⚠️  No test file mapping for suite: $SUITE_NAME${NC}"
      ;;
  esac
done

if [ ${#TEST_FILES[@]} -gt 0 ]; then
  npm test -- "${TEST_FILES[@]}"
else
  echo -e "${YELLOW}   No test files found. Running all tests...${NC}"
  npm test
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Integration test suite completed successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"