#!/bin/bash
set -e

# Argument 1 (Optional): Path to a pre-built tarball.
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

if [ -n "$PREBUILT_TARBALL" ]; then
  echo "Using prebuilt tarball: $PREBUILT_TARBALL"
  # Resolve absolute path if it's relative
  if [[ "$PREBUILT_TARBALL" != /* ]]; then
    PREBUILT_TARBALL="$START_DIR/$PREBUILT_TARBALL"
  fi
  TARBALL_PATH="$PREBUILT_TARBALL"
else
  echo "Building project..."
  # Ensure we are in the project root for building
  SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
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
npm install "$TARBALL_PATH" > /dev/null

echo "Generating verification scripts..."
node -e '
const fs = require("fs");
// Read the package.json of the INSTALLED package to verify what was actually packed
const pkg = require("./node_modules/firebase-functions/package.json");
const exports = Object.keys(pkg.exports);

// Filter out non-code entrypoints (e.g. package.json if it were exported)
const entryPoints = exports.filter(e => !e.endsWith(".json"));

let cjsContent = "console.log(\"Verifying CJS exports...\");\n";
let esmContent = "console.log(\"Verifying ESM exports...\");\n";

for (const exp of entryPoints) {
  const importPath = exp === "." ? "firebase-functions" : `firebase-functions/${exp.replace("./", "")}`;
  cjsContent += `try { require("${importPath}"); console.log("✅ CJS: ${importPath}"); } catch (e) { console.error("❌ CJS Failed: ${importPath}", e); process.exit(1); }\n`;
  esmContent += `try { await import("${importPath}"); console.log("✅ ESM: ${importPath}"); } catch (e) { console.error("❌ ESM Failed: ${importPath}", e); process.exit(1); }\n`;
}

fs.writeFileSync("verify-cjs.cjs", cjsContent);
fs.writeFileSync("verify-esm.mjs", esmContent);
'

echo "Running CJS verification..."
node verify-cjs.cjs

echo "Running ESM verification..."
node verify-esm.mjs

popd > /dev/null
echo "✨ Packaging test passed!"
