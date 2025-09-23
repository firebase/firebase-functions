#!/bin/bash

# Complete integration test runner for suites
# Supports patterns and unified configuration
# Usage: ./scripts/run-suite.sh <suite-names-or-patterns...> [options]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Check for help or list options first
if [ $# -eq 0 ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo -e "${BLUE}Usage: $0 <suite-names-or-patterns...> [options]${NC}"
  echo ""
  echo "Examples:"
  echo "  $0 v1_firestore                    # Single suite"
  echo "  $0 v1_firestore v1_database        # Multiple suites"
  echo "  $0 'v1_*'                          # All v1 suites (pattern)"
  echo "  $0 'v2_*'                          # All v2 suites (pattern)"
  echo "  $0 --list                          # List available suites"
  echo ""
  echo "Options:"
  echo "  --test-run-id=ID   Use specific TEST_RUN_ID instead of generating one"
  echo "  --save-artifact    Save test metadata for future cleanup"
  echo "  --list            List all available suites"
  echo "  --help, -h        Show this help message"
  exit 0
fi

# Handle --list option
if [ "$1" = "--list" ]; then
  node "$SCRIPT_DIR/generate.js" --list
  exit 0
fi

# Parse arguments - collect suite patterns and check for flags
SUITE_PATTERNS=()
SAVE_ARTIFACT=""
PROVIDED_TEST_RUN_ID=""
for arg in "$@"; do
  if [ "$arg" = "--save-artifact" ]; then
    SAVE_ARTIFACT="--save-artifact"
  elif [[ "$arg" == --test-run-id=* ]]; then
    PROVIDED_TEST_RUN_ID="${arg#*=}"
  elif [[ "$arg" != --* ]]; then
    SUITE_PATTERNS+=("$arg")
  fi
done

if [ ${#SUITE_PATTERNS[@]} -eq 0 ]; then
  echo -e "${RED}❌ At least one suite name or pattern required${NC}"
  echo "Use $0 --help for usage information"
  exit 1
fi

# Use provided TEST_RUN_ID or generate a new one
if [ -n "$PROVIDED_TEST_RUN_ID" ]; then
  export TEST_RUN_ID="$PROVIDED_TEST_RUN_ID"
  echo -e "${GREEN}📋 Using provided TEST_RUN_ID: ${TEST_RUN_ID}${NC}"
else
  # Generate unique TEST_RUN_ID (short to avoid 63-char function name limit)
  export TEST_RUN_ID="t$(head -c 8 /dev/urandom | base64 | tr -d '/+=' | tr '[:upper:]' '[:lower:]' | head -c 8)"
fi

# Verify TEST_RUN_ID was generated successfully
if [ -z "$TEST_RUN_ID" ] || [ "$TEST_RUN_ID" = "t" ]; then
  echo -e "${RED}❌ Failed to generate TEST_RUN_ID${NC}"
  echo -e "${YELLOW}   This may be due to missing /dev/urandom or base64 utilities${NC}"
  # Fallback to timestamp-based ID
  export TEST_RUN_ID="t$(date +%s | tail -c 8)"
  echo -e "${YELLOW}   Using fallback TEST_RUN_ID: ${TEST_RUN_ID}${NC}"
fi

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🚀 Running Integration Test Suite(s)${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}📋 Test Run ID: ${TEST_RUN_ID}${NC}"
echo ""

# Function to cleanup on exit
cleanup() {
  local exit_code=$?
  echo ""
  echo -e "${YELLOW}🧹 Running cleanup...${NC}"

  # Verify TEST_RUN_ID is available for cleanup
  if [ -z "$TEST_RUN_ID" ]; then
    echo -e "${YELLOW}   Warning: TEST_RUN_ID not set, cleanup may be incomplete${NC}"
  fi

  # Check if metadata exists
  if [ -f "$ROOT_DIR/generated/.metadata.json" ]; then
    # Extract project ID from metadata
    PROJECT_ID=$(grep '"projectId"' "$ROOT_DIR/generated/.metadata.json" | cut -d'"' -f4)
    REGION=$(grep '"region"' "$ROOT_DIR/generated/.metadata.json" | cut -d'"' -f4 | head -1)

    # Set default region if not found
    [ -z "$REGION" ] && REGION="us-central1"

    if [ -n "$PROJECT_ID" ]; then
      # Only delete functions if deployment was successful
      if [ "$DEPLOYMENT_SUCCESS" = true ]; then
        echo -e "${YELLOW}   Deleting deployed functions with TEST_RUN_ID: $TEST_RUN_ID${NC}"

        # Extract function names from metadata
        if command -v jq &> /dev/null; then
          # Use jq if available for precise extraction
          FUNCTIONS=$(jq -r '.suites[].functions[]' "$ROOT_DIR/generated/.metadata.json" 2>/dev/null || true)
        else
          # Fallback to grep-based extraction, excluding the testRunId field
          FUNCTIONS=$(grep '"functions"' -A 20 "$ROOT_DIR/generated/.metadata.json" | grep -oE '"[a-zA-Z]+[a-zA-Z0-9]*'${TEST_RUN_ID}'"' | tr -d '"' || true)
        fi

        if [ -n "$FUNCTIONS" ]; then
          for FUNCTION in $FUNCTIONS; do
            echo "   Deleting function: $FUNCTION"
            # Try Firebase CLI first
            if ! firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --region "$REGION" --force 2>/dev/null; then
              # If Firebase CLI fails, try gcloud
              echo "   Firebase CLI failed, trying gcloud..."
              gcloud functions delete "$FUNCTION" --region="$REGION" --project="$PROJECT_ID" --quiet 2>/dev/null || true
            fi
          done
        fi
      else
        echo -e "${YELLOW}   Skipping function deletion (deployment was not successful)${NC}"
      fi

      # Clean up test data from Firestore - extract collections from metadata
      echo -e "${YELLOW}   Cleaning up Firestore test data...${NC}"

      # Extract all unique collection names from the metadata
      COLLECTIONS=$(grep -oE '"collection"[[:space:]]*:[[:space:]]*"[^"]*"' "$ROOT_DIR/generated/.metadata.json" 2>/dev/null | cut -d'"' -f4 | sort -u || true)

      # Also check for functions that default to their name as collection
      FUNCTION_NAMES=$(grep -oE '"name"[[:space:]]*:[[:space:]]*"[^"]*Tests"' "$ROOT_DIR/generated/.metadata.json" 2>/dev/null | cut -d'"' -f4 | sed "s/${TEST_RUN_ID}$//" | sort -u || true)

      # Combine and deduplicate
      ALL_COLLECTIONS=$(echo -e "$COLLECTIONS\n$FUNCTION_NAMES" | grep -v '^$' | sort -u)

      for COLLECTION in $ALL_COLLECTIONS; do
        if [ -n "$COLLECTION" ]; then
          echo "   Cleaning collection: $COLLECTION/$TEST_RUN_ID"
          firebase firestore:delete "$COLLECTION/$TEST_RUN_ID" --project "$PROJECT_ID" --yes 2>/dev/null || true
        fi
      done

      # Clean up auth users created during tests
      if grep -q "auth" "$ROOT_DIR/generated/.metadata.json" 2>/dev/null; then
        echo -e "${YELLOW}   Cleaning up auth test users...${NC}"
        node "$SCRIPT_DIR/cleanup-auth-users.cjs" "$TEST_RUN_ID" 2>/dev/null || true
      fi
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

# Track deployment status
DEPLOYMENT_SUCCESS=false

# Set trap to run cleanup on exit
trap cleanup EXIT INT TERM

# Step 1: Generate functions
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"
echo -e "${GREEN}📦 Step 1/4: Generating functions${NC}"
echo -e "${BLUE}──────────────────────────────────────────────────────────${NC}"

cd "$ROOT_DIR"
npm run generate "${SUITE_PATTERNS[@]}"

# Extract project ID and suite info from metadata
METADATA_FILE="$ROOT_DIR/generated/.metadata.json"
if [ ! -f "$METADATA_FILE" ]; then
  echo -e "${RED}❌ Metadata file not found after generation${NC}"
  exit 1
fi

PROJECT_ID=$(grep '"projectId"' "$METADATA_FILE" | cut -d'"' -f4)
export PROJECT_ID

# Extract actual suite names that were generated
GENERATED_SUITES=$(grep -oE '"name"[[:space:]]*:[[:space:]]*"v[12]_[^"]*"' "$METADATA_FILE" | cut -d'"' -f4 | sort -u)
SUITE_COUNT=$(echo "$GENERATED_SUITES" | wc -l | tr -d ' ')

echo ""
echo -e "${GREEN}✓ Generated $SUITE_COUNT suite(s) for project: ${PROJECT_ID}${NC}"

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

# Check if using local tarball
if [ -n "$SDK_TARBALL" ] && [ -f "$SDK_TARBALL" ]; then
  echo "   Using SDK tarball: $SDK_TARBALL"
elif [ -f "../../firebase-functions-local.tgz" ]; then
  echo "   Using local firebase-functions tarball"
  # Update package.json to use local tarball
  sed -i.bak 's|"firebase-functions": "[^"]*"|"firebase-functions": "file:../../firebase-functions-local.tgz"|' package.json
  rm package.json.bak
else
  echo "   Using published firebase-functions package"
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

# Source the utility functions for retry logic
source "$ROOT_DIR/scripts/util.sh"

# Deploy with exponential backoff retry - but handle cleanup policy warnings
MAX_ATTEMPTS=3
ATTEMPT=1
DEPLOY_FAILED=true

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
  echo -e "${YELLOW}🔄 Attempt $ATTEMPT of $MAX_ATTEMPTS: firebase deploy --only functions --project $PROJECT_ID${NC}"

  if firebase deploy --only functions --project "$PROJECT_ID" 2>&1 | tee deploy.log; then
    echo -e "${GREEN}✅ Deployment succeeded${NC}"
    DEPLOY_FAILED=false
    break
  elif grep -q "Functions successfully deployed but could not set up cleanup policy" deploy.log; then
    echo -e "${YELLOW}⚠️  Functions deployed successfully (cleanup policy warning ignored)${NC}"
    DEPLOY_FAILED=false
    break
  elif grep -q "identityBeforeUserCreatedTest.*identityBeforeUserSignedInTest" deploy.log && firebase functions:list --project "$PROJECT_ID" 2>/dev/null | grep -q "$TEST_RUN_ID"; then
    echo -e "${YELLOW}⚠️  Functions appear to be deployed despite errors${NC}"
    DEPLOY_FAILED=false
    break
  fi

  if [ $ATTEMPT -lt $MAX_ATTEMPTS ]; then
    DELAY=$((20 + RANDOM % 40))
    echo -e "${YELLOW}⚠️  Command failed. Retrying in ${DELAY} seconds...${NC}"
    sleep $DELAY
  fi

  ATTEMPT=$((ATTEMPT + 1))
done

rm -f deploy.log

if [ "$DEPLOY_FAILED" = true ]; then
  echo -e "${RED}❌ Deployment failed after all retry attempts${NC}"
  exit 1
fi

# Mark deployment as successful if we reach here
DEPLOYMENT_SUCCESS=true
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
if [ -f "$ROOT_DIR/sa.json" ]; then
  export GOOGLE_APPLICATION_CREDENTIALS="$ROOT_DIR/sa.json"
fi
export REGION="us-central1"

# Function to map suite name to test file path
get_test_file() {
  local suite_name="$1"
  local service="${suite_name#*_}"  # Extract service name after underscore
  local version="${suite_name%%_*}"  # Extract version (v1 or v2)

  case "$suite_name" in
    v1_auth*)
      echo "tests/v1/auth.test.ts"
      ;;
    v2_alerts)
      # v2_alerts doesn't have tests (deployment only)
      echo ""
      ;;
    *)
      # Map service names to test files
      case "$service" in
        firestore)
          echo "tests/$version/firestore.test.ts"
          ;;
        database)
          echo "tests/$version/database.test.ts"
          ;;
        pubsub)
          echo "tests/$version/pubsub.test.ts"
          ;;
        storage)
          echo "tests/$version/storage.test.ts"
          ;;
        tasks)
          echo "tests/$version/tasks.test.ts"
          ;;
        remoteconfig)
          # Handle case sensitivity issue
          if [ "$version" = "v1" ]; then
            echo "tests/v1/remoteconfig.test.ts"
          else
            echo "tests/v2/remoteConfig.test.ts"
          fi
          ;;
        testlab)
          # Handle case sensitivity issue
          if [ "$version" = "v1" ]; then
            echo "tests/v1/testlab.test.ts"
          else
            echo "tests/v2/testLab.test.ts"
          fi
          ;;
        scheduler)
          echo "tests/v2/scheduler.test.ts"
          ;;
        identity)
          echo "tests/v2/identity.test.ts"
          ;;
        eventarc)
          echo "tests/v2/eventarc.test.ts"
          ;;
        *)
          echo -e "${YELLOW}⚠️  No test file mapping for suite: $suite_name${NC}" >&2
          echo ""
          ;;
      esac
      ;;
  esac
}

# Extract deployed functions info for auth tests
DEPLOYED_FUNCTIONS=""
for SUITE_NAME in $GENERATED_SUITES; do
  case "$SUITE_NAME" in
    v1_auth_nonblocking)
      DEPLOYED_FUNCTIONS="${DEPLOYED_FUNCTIONS},onCreate,onDelete"
      ;;
    v1_auth_before_create)
      DEPLOYED_FUNCTIONS="${DEPLOYED_FUNCTIONS},beforeCreate"
      ;;
    v1_auth_before_signin)
      DEPLOYED_FUNCTIONS="${DEPLOYED_FUNCTIONS},beforeSignIn"
      ;;
  esac
done

# Remove leading comma
DEPLOYED_FUNCTIONS="${DEPLOYED_FUNCTIONS#,}"

# Collect test files for all generated suites
TEST_FILES=()
SEEN_FILES=()
for SUITE_NAME in $GENERATED_SUITES; do
  TEST_FILE=$(get_test_file "$SUITE_NAME")

  if [ -n "$TEST_FILE" ]; then
    # Check if we've already added this test file (for auth suites)
    if [[ ! " ${SEEN_FILES[@]} " =~ " ${TEST_FILE} " ]]; then
      if [ -f "$ROOT_DIR/$TEST_FILE" ]; then
        TEST_FILES+=("$TEST_FILE")
        SEEN_FILES+=("$TEST_FILE")
      else
        echo -e "${YELLOW}⚠️  Test file not found: $TEST_FILE${NC}"
      fi
    fi
  fi
done

if [ ${#TEST_FILES[@]} -gt 0 ]; then
  # Final verification that TEST_RUN_ID is set before running tests
  if [ -z "$TEST_RUN_ID" ]; then
    echo -e "${RED}❌ TEST_RUN_ID is not set. Cannot run tests.${NC}"
    exit 1
  fi

  echo -e "${GREEN}Running tests: ${TEST_FILES[*]}${NC}"
  echo -e "${GREEN}TEST_RUN_ID: ${TEST_RUN_ID}${NC}"
  DEPLOYED_FUNCTIONS="$DEPLOYED_FUNCTIONS" TEST_RUN_ID="$TEST_RUN_ID" npm test -- "${TEST_FILES[@]}"
else
  echo -e "${YELLOW}⚠️  No test files found for the generated suites.${NC}"
  echo -e "${YELLOW}   Generated suites: $GENERATED_SUITES${NC}"
  echo -e "${GREEN}   Skipping test execution (deployment-only suites).${NC}"
fi

echo ""
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ Integration test suite completed successfully!${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"