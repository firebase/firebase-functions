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

# Function to run a single suite
run_suite() {
    local suite_name="$1"
    local suite_log="$LOGS_DIR/${suite_name}-${TIMESTAMP}.log"
    
    log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    log "${GREEN}🚀 Running suite: $suite_name${NC}"
    log "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    log "${YELLOW}📝 Suite log: $suite_log${NC}"
    
    # Run the suite and capture both stdout and stderr
    if ./scripts/run-suite.sh "$suite_name" 2>&1 | tee "$suite_log"; then
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

# Define suites in order
SUITES=(
    "v1_firestore"
    "v1_database"
    "v1_pubsub"
    "v1_storage"
    "v1_tasks"
    "v1_remoteconfig"
    "v1_testlab"
    "v1_auth_nonblocking"
)

# Track results
PASSED=0
FAILED=0
FAILED_SUITES=()

# Run each suite sequentially
for suite in "${SUITES[@]}"; do
    if run_suite "$suite"; then
        ((PASSED++))
    else
        ((FAILED++))
        FAILED_SUITES+=("$suite")
    fi
    log ""
done

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
