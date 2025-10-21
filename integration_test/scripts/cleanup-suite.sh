#!/bin/bash

# Cleanup script for deployed functions
# Usage:
#   ./scripts/cleanup-suite.sh                    # Uses saved metadata
#   ./scripts/cleanup-suite.sh <TEST_RUN_ID>      # Cleanup specific run
#   ./scripts/cleanup-suite.sh --pattern <pattern> # Cleanup by pattern

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
METADATA_FILE="$ROOT_DIR/generated/.metadata.json"
ARTIFACTS_DIR="$ROOT_DIR/.test-artifacts"

echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}🧹 Firebase Functions Cleanup Tool${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"

# Function to cleanup by TEST_RUN_ID
cleanup_by_id() {
  local TEST_RUN_ID="$1"
  local PROJECT_ID="$2"
  local METADATA_SOURCE="$3"  # Optional metadata file

  echo -e "${YELLOW}🗑️  Cleaning up TEST_RUN_ID: $TEST_RUN_ID${NC}"
  echo -e "${YELLOW}   Project: $PROJECT_ID${NC}"

  # Delete functions
  echo -e "${YELLOW}   Deleting functions...${NC}"

  # Try to get function names from metadata if available
  if [ -n "$METADATA_SOURCE" ] && [ -f "$METADATA_SOURCE" ]; then
    # Extract function names from metadata
    FUNCTIONS=$(grep -o '"[^"]*_'${TEST_RUN_ID}'"' "$METADATA_SOURCE" | tr -d '"')

    if [ -n "$FUNCTIONS" ]; then
      for FUNCTION in $FUNCTIONS; do
        echo "   Deleting function: $FUNCTION"
        firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --force 2>/dev/null || true
      done
    fi
  else
    # Fallback: try common patterns
    echo "   No metadata found, trying common function patterns..."
    FUNCTION_PATTERNS=(
      "firestoreDocumentOnCreateTests_${TEST_RUN_ID}"
      "firestoreDocumentOnDeleteTests_${TEST_RUN_ID}"
      "firestoreDocumentOnUpdateTests_${TEST_RUN_ID}"
      "firestoreDocumentOnWriteTests_${TEST_RUN_ID}"
      "databaseRefOnCreateTests_${TEST_RUN_ID}"
      "databaseRefOnDeleteTests_${TEST_RUN_ID}"
      "databaseRefOnUpdateTests_${TEST_RUN_ID}"
      "databaseRefOnWriteTests_${TEST_RUN_ID}"
    )

    for FUNCTION in "${FUNCTION_PATTERNS[@]}"; do
      firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --force 2>/dev/null || true
    done
  fi

  # Clean up Firestore collections
  echo -e "${YELLOW}   Cleaning up Firestore test data...${NC}"
  for COLLECTION in firestoreDocumentOnCreateTests firestoreDocumentOnDeleteTests firestoreDocumentOnUpdateTests firestoreDocumentOnWriteTests; do
    firebase firestore:delete "$COLLECTION/$TEST_RUN_ID" --project "$PROJECT_ID" --yes 2>/dev/null || true
  done

  # Clean up Realtime Database paths
  echo -e "${YELLOW}   Cleaning up Realtime Database test data...${NC}"
  for PATH in databaseRefOnCreateTests databaseRefOnDeleteTests databaseRefOnUpdateTests databaseRefOnWriteTests; do
    firebase database:remove "/$PATH/$TEST_RUN_ID" --project "$PROJECT_ID" --force 2>/dev/null || true
  done
}

# Function to save artifact for future cleanup
save_artifact() {
  if [ -f "$METADATA_FILE" ]; then
    mkdir -p "$ARTIFACTS_DIR"

    # Extract metadata
    TEST_RUN_ID=$(grep '"testRunId"' "$METADATA_FILE" | cut -d'"' -f4)
    PROJECT_ID=$(grep '"projectId"' "$METADATA_FILE" | cut -d'"' -f4)
    SUITE=$(grep '"suite"' "$METADATA_FILE" | cut -d'"' -f4)

    # Save artifact with timestamp
    ARTIFACT_FILE="$ARTIFACTS_DIR/${TEST_RUN_ID}.json"
    cp "$METADATA_FILE" "$ARTIFACT_FILE"

    echo -e "${GREEN}✓ Saved cleanup artifact: $ARTIFACT_FILE${NC}"
  fi
}

# Parse arguments
if [ "$1" == "--save-artifact" ]; then
  # Save current metadata as artifact for future cleanup
  save_artifact
  exit 0

elif [ "$1" == "--pattern" ]; then
  # Cleanup by pattern
  PATTERN="$2"
  PROJECT_ID="${3:-$PROJECT_ID}"

  if [ -z "$PATTERN" ] || [ -z "$PROJECT_ID" ]; then
    echo -e "${RED}❌ Usage: $0 --pattern <pattern> <project-id>${NC}"
    exit 1
  fi

  echo -e "${YELLOW}🗑️  Cleaning up functions matching pattern: $PATTERN${NC}"
  echo -e "${YELLOW}   Project: $PROJECT_ID${NC}"

  FUNCTIONS=$(firebase functions:list --project "$PROJECT_ID" 2>/dev/null | grep "$PATTERN" | awk '{print $1}' || true)

  if [ -z "$FUNCTIONS" ]; then
    echo -e "${YELLOW}   No functions found matching pattern: $PATTERN${NC}"
  else
    for FUNCTION in $FUNCTIONS; do
      echo "   Deleting function: $FUNCTION"
      firebase functions:delete "$FUNCTION" --project "$PROJECT_ID" --force 2>/dev/null || true
    done
  fi

elif [ "$1" == "--list-artifacts" ]; then
  # List saved artifacts
  echo -e "${BLUE}📋 Saved test artifacts:${NC}"
  if [ -d "$ARTIFACTS_DIR" ]; then
    for artifact in "$ARTIFACTS_DIR"/*.json; do
      if [ -f "$artifact" ]; then
        TEST_RUN_ID=$(grep '"testRunId"' "$artifact" | cut -d'"' -f4)
        PROJECT_ID=$(grep '"projectId"' "$artifact" | cut -d'"' -f4)
        SUITE=$(grep '"suite"' "$artifact" | cut -d'"' -f4)
        TIMESTAMP=$(grep '"generatedAt"' "$artifact" | cut -d'"' -f4)
        echo -e "${GREEN}   • $TEST_RUN_ID${NC} ($SUITE) - $PROJECT_ID - $TIMESTAMP"
      fi
    done
  else
    echo -e "${YELLOW}   No artifacts found${NC}"
  fi

elif [ "$1" == "--clean-artifacts" ]; then
  # Clean all artifacts and their deployed functions
  if [ ! -d "$ARTIFACTS_DIR" ]; then
    echo -e "${YELLOW}No artifacts to clean${NC}"
    exit 0
  fi

  echo -e "${YELLOW}⚠️  This will clean up ALL saved test runs!${NC}"
  read -p "Are you sure? (yes/no): " -r
  if [[ ! $REPLY == "yes" ]]; then
    echo -e "${GREEN}Cancelled${NC}"
    exit 0
  fi

  for artifact in "$ARTIFACTS_DIR"/*.json; do
    if [ -f "$artifact" ]; then
      TEST_RUN_ID=$(grep '"testRunId"' "$artifact" | cut -d'"' -f4)
      PROJECT_ID=$(grep '"projectId"' "$artifact" | cut -d'"' -f4)
      cleanup_by_id "$TEST_RUN_ID" "$PROJECT_ID"
      rm "$artifact"
    fi
  done

  echo -e "${GREEN}✅ All artifacts cleaned${NC}"

elif [ -n "$1" ]; then
  # Cleanup specific TEST_RUN_ID
  TEST_RUN_ID="$1"

  # Try to find project ID from artifact
  if [ -f "$ARTIFACTS_DIR/${TEST_RUN_ID}.json" ]; then
    PROJECT_ID=$(grep '"projectId"' "$ARTIFACTS_DIR/${TEST_RUN_ID}.json" | cut -d'"' -f4)
    echo -e "${GREEN}Found artifact for $TEST_RUN_ID${NC}"
  else
    # Fall back to environment or prompt
    if [ -z "$PROJECT_ID" ]; then
      echo -e "${YELLOW}No artifact found for $TEST_RUN_ID${NC}"
      read -p "Enter PROJECT_ID: " PROJECT_ID
    fi
  fi

  cleanup_by_id "$TEST_RUN_ID" "$PROJECT_ID"

  # Remove artifact if exists
  if [ -f "$ARTIFACTS_DIR/${TEST_RUN_ID}.json" ]; then
    rm "$ARTIFACTS_DIR/${TEST_RUN_ID}.json"
    echo -e "${GREEN}✓ Removed artifact${NC}"
  fi

else
  # Default: use current metadata
  if [ ! -f "$METADATA_FILE" ]; then
    echo -e "${YELLOW}No current deployment found in generated/.metadata.json${NC}"
    echo ""
    echo "Usage:"
    echo "  $0                           # Clean current deployment"
    echo "  $0 <TEST_RUN_ID>            # Clean specific test run"
    echo "  $0 --pattern <pattern> <project-id>  # Clean by pattern"
    echo "  $0 --list-artifacts         # List saved test runs"
    echo "  $0 --clean-artifacts        # Clean all saved test runs"
    echo "  $0 --save-artifact          # Save current deployment for later cleanup"
    exit 0
  fi

  # Extract from current metadata
  TEST_RUN_ID=$(grep '"testRunId"' "$METADATA_FILE" | cut -d'"' -f4)
  PROJECT_ID=$(grep '"projectId"' "$METADATA_FILE" | cut -d'"' -f4)

  cleanup_by_id "$TEST_RUN_ID" "$PROJECT_ID" "$METADATA_FILE"

  # Clean generated files
  echo -e "${YELLOW}   Cleaning up generated files...${NC}"
  /bin/rm -rf "$ROOT_DIR/generated"/*
fi

echo -e "${GREEN}✅ Cleanup complete!${NC}"