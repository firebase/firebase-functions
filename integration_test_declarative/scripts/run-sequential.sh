#!/bin/bash

# Sequential test suite runner
# Runs each suite individually to avoid Firebase infrastructure conflicts

# Don't exit on error - we want to run all suites and report at the end
# set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse arguments
FILTER_PATTERN=""
EXCLUDE_PATTERN=""
SKIP_CLEANUP=false
SHOW_HELP=false

for arg in "$@"; do
  case $arg in
    --help|-h)
      SHOW_HELP=true
      shift
      ;;
    --filter=*)
      FILTER_PATTERN="${arg#*=}"
      shift
      ;;
    --exclude=*)
      EXCLUDE_PATTERN="${arg#*=}"
      shift
      ;;
    --skip-cleanup)
      SKIP_CLEANUP=true
      shift
      ;;
    *)
      ;;
  esac
done

# Show help if requested
if [ "$SHOW_HELP" = true ] || [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --filter=PATTERN   Only run suites matching pattern (e.g., --filter=v1)"
  echo "  --exclude=PATTERN  Skip suites matching pattern (e.g., --exclude=auth)"
  echo "  --skip-cleanup     Skip pre-run cleanup of existing test resources"
  echo "  --help, -h         Show this help message"
  echo ""
  echo "Examples:"
  echo "  $0                     # Run all suites"
  echo "  $0 --filter=v1         # Run only v1 suites"
  echo "  $0 --filter=v2         # Run only v2 suites"
  echo "  $0 --exclude=auth      # Skip auth-related suites"
  echo "  $0 --exclude=blocking  # Skip blocking auth suites"
  exit 0
fi

# Get directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Create logs directory
LOGS_DIR="$ROOT_DIR/logs"
mkdir -p "$LOGS_DIR"

# Generate timestamp for log file
TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
LOG_FILE="$LOGS_DIR/sequential-test-${TIMESTAMP}.log"

# Function to log with timestamp
log() {
    echo -e "$1" | tee -a "$LOG_FILE"
}

# Function to clean up existing test resources
cleanup_existing_test_resources() {
    log "${YELLOW}🧹 Checking for existing test functions...${NC}"

    # Clean up both main project and v2 project
    local PROJECTS=("functions-integration-tests" "functions-integration-tests-v2")

    for PROJECT_ID in "${PROJECTS[@]}"; do
        log "${YELLOW}   Checking project: $PROJECT_ID${NC}"

        # List all functions and find test functions (those with test run IDs)
        local TEST_FUNCTIONS=$(firebase functions:list --project "$PROJECT_ID" 2>/dev/null | grep -E "Test.*t[a-z0-9]{8,9}" | awk '{print $1}' || true)

        if [ -n "$TEST_FUNCTIONS" ]; then
            local FUNCTION_COUNT=$(echo "$TEST_FUNCTIONS" | wc -l | tr -d ' ')
            log "${YELLOW}     Found $FUNCTION_COUNT existing test function(s) in $PROJECT_ID. Cleaning up...${NC}"

            for FUNCTION in $TEST_FUNCTIONS; do
                log "     Deleting: $FUNCTION"
                # Try firebase CLI first, fallback to gcloud if it fails
                if ! firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --region "us-central1" --force 2>/dev/null; then
                    # Fallback to gcloud for stubborn functions (like identity functions with config issues)
                    gcloud functions delete "$FUNCTION" --project "$PROJECT_ID" --region "us-central1" --quiet 2>/dev/null || true
                fi
            done

            log "${GREEN}     ✅ Cleaned up test functions from $PROJECT_ID${NC}"
        else
            log "${GREEN}     ✅ No test functions found in $PROJECT_ID${NC}"
        fi
    done

    # Clean up any stray test data in Firestore
    log "${YELLOW}   Checking for stray test data in Firestore...${NC}"

    # Clean up common test collections
    local TEST_COLLECTIONS=(
        "authUserOnCreateTests"
        "authUserOnDeleteTests"
        "authBeforeCreateTests"
        "authBeforeSignInTests"
        "firestoreDocumentOnCreateTests"
        "firestoreDocumentOnDeleteTests"
        "firestoreDocumentOnUpdateTests"
        "firestoreDocumentOnWriteTests"
        "databaseRefOnCreateTests"
        "databaseRefOnDeleteTests"
        "databaseRefOnUpdateTests"
        "databaseRefOnWriteTests"
    )

    for COLLECTION in "${TEST_COLLECTIONS[@]}"; do
        # Try to delete any documents in test collections
        firebase firestore:delete "$COLLECTION" --project "$PROJECT_ID" --yes --recursive 2>/dev/null || true
    done

    log "${GREEN}   ✅ Firestore cleanup complete${NC}"

    # Clean up generated directory
    if [ -d "$ROOT_DIR/generated" ]; then
        log "${YELLOW}   Cleaning up generated directory...${NC}"
        rm -rf "$ROOT_DIR/generated"/*
        log "${GREEN}   ✅ Generated directory cleaned${NC}"
    fi

    log ""
}

# Function to run a single suite
run_suite() {
    local suite_name="$1"
    local test_run_id="$2"
    local suite_log="$LOGS_DIR/${suite_name}-${TIMESTAMP}.log"

    log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    log "${GREEN}🚀 Running suite: $suite_name${NC}"
    log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    log "${YELLOW}📝 Suite log: $suite_log${NC}"

    # Run the suite with the shared TEST_RUN_ID
    if ./scripts/run-suite.sh "$suite_name" --test-run-id="$test_run_id" 2>&1 | tee "$suite_log"; then
        log "${GREEN}✅ Suite $suite_name completed successfully${NC}"
        return 0
    else
        log "${RED}❌ Suite $suite_name failed${NC}"
        return 1
    fi
}

# Main execution
log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log "${GREEN}🚀 Starting Sequential Test Suite Execution${NC}"
log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log "${YELLOW}📝 Main log: $LOG_FILE${NC}"
log "${YELLOW}📁 Logs directory: $LOGS_DIR${NC}"
log ""

# Get all available suites dynamically
# Extract suite names from both v1 and v2 configs
V1_SUITES=()
V2_SUITES=()

# Get v1 suites if config exists
if [ -f "$ROOT_DIR/config/v1/suites.yaml" ]; then
    V1_SUITES=($(node -e "
        const yaml = require('yaml');
        const fs = require('fs');
        const config = yaml.parse(fs.readFileSync('config/v1/suites.yaml', 'utf8'));
        config.suites.forEach(s => console.log(s.name));
    " 2>/dev/null || echo ""))
fi

# Get v2 suites if config exists
if [ -f "$ROOT_DIR/config/v2/suites.yaml" ]; then
    V2_SUITES=($(node -e "
        const yaml = require('yaml');
        const fs = require('fs');
        const config = yaml.parse(fs.readFileSync('config/v2/suites.yaml', 'utf8'));
        config.suites.forEach(s => console.log(s.name));
    " 2>/dev/null || echo ""))
fi

# Combine all suites (v1 first, then v2)
ALL_SUITES=("${V1_SUITES[@]}" "${V2_SUITES[@]}")

# Default exclusions (v2_identity has issues with Identity Platform UI)
DEFAULT_EXCLUDE="v2_identity"

# Apply filters
SUITES=()
for suite in "${ALL_SUITES[@]}"; do
    # Apply include filter if specified
    if [ -n "$FILTER_PATTERN" ]; then
        if [[ ! "$suite" =~ $FILTER_PATTERN ]]; then
            continue
        fi
    fi

    # Apply exclude filter if specified (user exclusions + default)
    if [ -n "$EXCLUDE_PATTERN" ]; then
        if [[ "$suite" =~ $EXCLUDE_PATTERN ]]; then
            log "${YELLOW}   Skipping $suite (matches exclude pattern)${NC}"
            continue
        fi
    fi

    # Apply default exclusions (unless explicitly included via filter)
    if [ -z "$FILTER_PATTERN" ] && [[ "$suite" =~ $DEFAULT_EXCLUDE ]]; then
        log "${YELLOW}   Skipping $suite (default exclusion - v2 blocking functions not supported in Identity Platform UI)${NC}"
        continue
    fi

    SUITES+=("$suite")
done

# Check if we found any suites after filtering
if [ ${#SUITES[@]} -eq 0 ]; then
    log "${RED}❌ No test suites found after filtering${NC}"
    log "${YELLOW}   Available suites: ${ALL_SUITES[*]}${NC}"
    if [ -n "$FILTER_PATTERN" ]; then
        log "${YELLOW}   Filter pattern: $FILTER_PATTERN${NC}"
    fi
    if [ -n "$EXCLUDE_PATTERN" ]; then
        log "${YELLOW}   Exclude pattern: $EXCLUDE_PATTERN${NC}"
    fi
    exit 1
fi

log "${GREEN}📋 Running ${#SUITES[@]} suite(s) sequentially:${NC}"
for suite in "${SUITES[@]}"; do
    log "   - $suite"
done
log ""

# Generate a single TEST_RUN_ID for all suites
export TEST_RUN_ID="t$(head -c 8 /dev/urandom | base64 | tr -d '/+=' | tr '[:upper:]' '[:lower:]' | head -c 8)"
log "${GREEN}📋 Generated TEST_RUN_ID for all suites: ${TEST_RUN_ID}${NC}"
log ""

# Run pre-test cleanup unless skipped
if [ "$SKIP_CLEANUP" = false ]; then
    cleanup_existing_test_resources
else
    log "${YELLOW}⚠️  Skipping pre-run cleanup (--skip-cleanup specified)${NC}"
    log ""
fi

# Track results
PASSED=0
FAILED=0
FAILED_SUITES=()

# Run each suite sequentially with the shared TEST_RUN_ID
for suite in "${SUITES[@]}"; do
    if run_suite "$suite" "$TEST_RUN_ID"; then
        ((PASSED++))
    else
        ((FAILED++))
        FAILED_SUITES+=("$suite")
    fi
    log ""
done

# Final cleanup - clean up auth users from this test run
log ""
log "${YELLOW}🧹 Running final cleanup for TEST_RUN_ID: ${TEST_RUN_ID}${NC}"

# Clean up auth users if any auth tests were run
if [[ " ${SUITES[@]} " =~ " v1_auth" ]] || [[ " ${SUITES[@]} " =~ " v2_identity" ]]; then
    log "${YELLOW}   Cleaning up auth test users...${NC}"
    node "$SCRIPT_DIR/cleanup-auth-users.cjs" "$TEST_RUN_ID" 2>/dev/null || true
fi

# Summary
log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log "${GREEN}📊 Sequential Test Suite Summary${NC}"
log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
log "${GREEN}✅ Passed: $PASSED suites${NC}"
log "${RED}❌ Failed: $FAILED suites${NC}"

if [ $FAILED -gt 0 ]; then
    log "${RED}Failed suites: ${FAILED_SUITES[*]}${NC}"
    log "${YELLOW}📝 Check individual suite logs in: $LOGS_DIR${NC}"
    exit 1
else
    log "${GREEN}🎉 All suites passed!${NC}"
    exit 0
fi
