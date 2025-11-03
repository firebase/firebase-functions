#!/bin/bash
set -eux

# Argument 1: Path to a pre-built tarball.
# If not provided, the script will run 'npm run build' and 'npm pack' locally.
PREBUILT_TARBALL="$1"

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

popd > /dev/null
