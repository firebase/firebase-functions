#!/bin/bash

set -e

# Source utility functions
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
source "$SCRIPT_DIR/util.sh"

# Configuration
MAX_RETRIES=${MAX_RETRIES:-3}
BASE_DELAY=${BASE_DELAY:-5}
MAX_DELAY=${MAX_DELAY:-60}
DEPLOY_TIMEOUT=${DEPLOY_TIMEOUT:-300}

echo -e "${GREEN}🚀 Starting deployment...${NC}"

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
  log_error "PROJECT_ID environment variable is required"
  exit 1
fi

# Set up service account authentication
setup_service_account() {
  log_info "Setting up service account authentication..."

  if [ ! -f "$ROOT_DIR/sa.json" ]; then
    log_error "Service account file not found: $ROOT_DIR/sa.json"
    return 1
  fi

  export GOOGLE_APPLICATION_CREDENTIALS="$ROOT_DIR/sa.json"
  log_info "Service account configured: $GOOGLE_APPLICATION_CREDENTIALS"
  return 0
}

# Check Firebase authentication
check_firebase_auth() {
  log_info "Checking Firebase authentication..."

  if ! firebase projects:list &> /dev/null; then
    log_error "Firebase authentication failed"
    return 1
  fi

  if ! firebase projects:list | grep -q "$PROJECT_ID"; then
    log_error "No access to project $PROJECT_ID"
    return 1
  fi

  log_info "Authentication verified for project: $PROJECT_ID"
  return 0
}

# Check if generated functions directory exists
FUNCTIONS_DIR="$ROOT_DIR/generated/functions"
if [ ! -d "$FUNCTIONS_DIR" ]; then
  log_error "Generated functions directory not found. Run 'npm run generate' first."
  exit 1
fi

cd "$FUNCTIONS_DIR"

# Read metadata
if [ -f "../.metadata.json" ]; then
  TEST_RUN_ID=$(grep '"testRunId"' ../.metadata.json | cut -d'"' -f4)
  log_info "Deploying functions with TEST_RUN_ID: $TEST_RUN_ID"
fi

# Install dependencies (retry for network issues)
install_dependencies() {
  log_info "Installing dependencies..."
  retry_with_backoff 3 $BASE_DELAY $MAX_DELAY $DEPLOY_TIMEOUT npm install
}

# Build TypeScript (no retry - deterministic)
build_typescript() {
  log_info "Building TypeScript..."
  npm run build
  log_info "Build successful"
}

# Deploy functions (retry with exponential backoff for rate limiting)
deploy_functions() {
  log_info "Deploying to Firebase project: $PROJECT_ID"
  log_debug "Using exponential backoff to avoid rate limiting"
  retry_with_backoff $MAX_RETRIES $BASE_DELAY $MAX_DELAY $DEPLOY_TIMEOUT firebase deploy --project "$PROJECT_ID" --only functions --force
}

# Verify deployment
verify_deployment() {
  log_info "Verifying deployment..."

  local deployed_functions
  deployed_functions=$(firebase functions:list --project "$PROJECT_ID" 2>/dev/null | grep "$TEST_RUN_ID" | wc -l || echo "0")

  if [ "$deployed_functions" -gt 0 ]; then
    log_info "Successfully deployed $deployed_functions functions"
    log_info "Deployed functions:"
    firebase functions:list --project "$PROJECT_ID" | grep "$TEST_RUN_ID" || true
  else
    log_error "No functions found with TEST_RUN_ID: $TEST_RUN_ID"
    return 1
  fi
}

# Main deployment flow
main() {
  setup_service_account || exit 1
  check_firebase_auth || exit 1
  install_dependencies
  build_typescript
  deploy_functions
  verify_deployment

  log_info "🎉 Deployment complete and verified!"
}

# Run main function
main