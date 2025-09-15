#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Starting deployment...${NC}"

# Check if PROJECT_ID is set
if [ -z "$PROJECT_ID" ]; then
  echo -e "${RED}❌ PROJECT_ID environment variable is required${NC}"
  exit 1
fi

# Get to the generated functions directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"
FUNCTIONS_DIR="$ROOT_DIR/generated/functions"

if [ ! -d "$FUNCTIONS_DIR" ]; then
  echo -e "${RED}❌ Generated functions directory not found. Run 'npm run generate' first.${NC}"
  exit 1
fi

cd "$FUNCTIONS_DIR"

# Read metadata
if [ -f "../.metadata.json" ]; then
  TEST_RUN_ID=$(grep '"testRunId"' ../.metadata.json | cut -d'"' -f4)
  echo -e "${GREEN}📋 Deploying functions with TEST_RUN_ID: $TEST_RUN_ID${NC}"
fi

# Install dependencies
echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

# Build TypeScript
echo -e "${YELLOW}🔨 Building TypeScript...${NC}"
npm run build

# Deploy to Firebase
echo -e "${YELLOW}☁️  Deploying to Firebase project: $PROJECT_ID${NC}"
firebase deploy --project "$PROJECT_ID" --only functions

echo -e "${GREEN}✅ Deployment complete!${NC}"

# List deployed functions
echo -e "${GREEN}📋 Deployed functions:${NC}"
firebase functions:list --project "$PROJECT_ID" | grep "$TEST_RUN_ID" || true