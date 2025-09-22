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

# Apply filters
SUITES=()
for suite in "${ALL_SUITES[@]}"; do
    # Apply include filter if specified
    if [ -n "$FILTER_PATTERN" ]; then
        if [[ ! "$suite" =~ $FILTER_PATTERN ]]; then
            continue
        fi
    fi

    # Apply exclude filter if specified
    if [ -n "$EXCLUDE_PATTERN" ]; then
        if [[ "$suite" =~ $EXCLUDE_PATTERN ]]; then
            log "${YELLOW}   Skipping $suite (matches exclude pattern)${NC}"
            continue
        fi
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
