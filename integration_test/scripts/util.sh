#!/bin/bash

# util.sh - Common utility functions for integration tests

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default configuration
DEFAULT_MAX_RETRIES=3
DEFAULT_BASE_DELAY=5
DEFAULT_MAX_DELAY=60
DEFAULT_TIMEOUT=300

# Exponential backoff with jitter
exponential_backoff() {
  local attempt="$1"
  local base_delay="$2"
  local max_delay="$3"

  # Calculate delay: base_delay * 2^(attempt-1)
  local delay=$((base_delay * (2 ** (attempt - 1))))

  # Cap at max_delay
  if [ $delay -gt $max_delay ]; then
    delay=$max_delay
  fi

  # Add jitter (±25% random variation)
  local jitter=$((delay / 4))
  local random_jitter=$((RANDOM % (jitter * 2) - jitter))
  delay=$((delay + random_jitter))

  # Ensure minimum delay of 1 second
  if [ $delay -lt 1 ]; then
    delay=1
  fi

  echo $delay
}

# Retry function with exponential backoff
retry_with_backoff() {
  local max_attempts="${1:-$DEFAULT_MAX_RETRIES}"
  local base_delay="${2:-$DEFAULT_BASE_DELAY}"
  local max_delay="${3:-$DEFAULT_MAX_DELAY}"
  local timeout="${4:-$DEFAULT_TIMEOUT}"
  local attempt=1
  shift 4

  while [ $attempt -le $max_attempts ]; do
    echo -e "${YELLOW}🔄 Attempt $attempt of $max_attempts: $@${NC}"

    if timeout "${timeout}s" "$@"; then
      echo -e "${GREEN}✅ Command succeeded${NC}"
      return 0
    fi

    if [ $attempt -lt $max_attempts ]; then
      local delay=$(exponential_backoff $attempt $base_delay $max_delay)
      echo -e "${YELLOW}⚠️  Command failed. Retrying in ${delay} seconds...${NC}"
      sleep $delay
    fi

    attempt=$((attempt + 1))
  done

  echo -e "${RED}❌ Command failed after $max_attempts attempts${NC}"
  return 1
}

# Logging functions
log_info() {
  echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
  echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
  echo -e "${BLUE}[DEBUG]${NC} $1"
}