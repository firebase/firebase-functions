#!/bin/bash
set -eux

# Argument 1: Path to a pre-built tarball.
# If not provided, the script will run 'npm run build' and 'npm pack' locally.
PREBUILT_TARBALL="${1:-}"

# Setup cleanup
WORK_DIR=$(mktemp -d)
function cleanup {
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
}
trap cleanup EXIT

# Save current directory to resolve relative paths later
START_DIR="$(pwd)"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

if [ -n "$PREBUILT_TARBALL" ]; then
  echo "Using prebuilt tarball: $PREBUILT_TARBALL"
  # Resolve absolute path if it's relative
  if [[ "$PREBUILT_TARBALL" != /* ]]; then
    PREBUILT_TARBALL="$START_DIR/$PREBUILT_TARBALL"
  fi
  TARBALL_PATH="$PREBUILT_TARBALL"
else
  echo "Building project..."
  cd "$SCRIPT_DIR/.."
  rm -rf lib
  npm run build

  echo "Packing project..."
  TARBALL=$(npm pack)
  mv "$TARBALL" "$WORK_DIR/"
  TARBALL_PATH="$WORK_DIR/$TARBALL"
fi

echo "Setting up test project in $WORK_DIR..."
pushd "$WORK_DIR" > /dev/null
npm init -y > /dev/null
npm install "$TARBALL_PATH"

echo "Running verification script..."
cp "$SCRIPT_DIR/verify-exports.mjs" .
node verify-exports.mjs

echo "Installing TypeScript consumer dependencies..."
TS_VERSION=$(node -p 'require("./node_modules/firebase-functions/package.json").devDependencies?.typescript || ""')
NODE_TYPES_VERSION=$(node -p 'require("./node_modules/firebase-functions/package.json").devDependencies?.["@types/node"] || ""')
GRAPHQL_VERSION=$(node -p 'require("./node_modules/firebase-functions/package.json").peerDependencies?.graphql || ""')
if [ -z "$TS_VERSION" ] || [ -z "$NODE_TYPES_VERSION" ] || [ -z "$GRAPHQL_VERSION" ]; then
  echo "❌ Failed to resolve typescript, @types/node, or graphql version from package.json"
  exit 1
fi
npm install --no-audit --no-fund "typescript@$TS_VERSION" "@types/node@$NODE_TYPES_VERSION"

echo "Running TypeScript declaration verification (core entrypoints)..."
cp "$SCRIPT_DIR/verify-types.mjs" .
node verify-types.mjs

echo "Installing optional peer dependencies for GraphQL type verification..."
npm install --no-audit --no-fund "graphql@$GRAPHQL_VERSION"

echo "Running TypeScript declaration verification (optional-peer entrypoints)..."
node verify-types.mjs --only-optional-peers

popd > /dev/null
