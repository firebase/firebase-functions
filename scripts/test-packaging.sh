#!/bin/bash
set -e

# Optional argument: path to existing tarball
PREBUILT_TARBALL="$1"

# Setup cleanup
WORK_DIR=$(mktemp -d)
function cleanup {
  rm -rf "$WORK_DIR"
  echo "Deleted temp working directory $WORK_DIR"
}
trap cleanup EXIT

# Get project root
PROJECT_ROOT="$(pwd)"

if [ -n "$PREBUILT_TARBALL" ]; then
  echo "Using prebuilt tarball: $PREBUILT_TARBALL"
  # Resolve absolute path if it's relative
  if [[ "$PREBUILT_TARBALL" != /* ]]; then
    PREBUILT_TARBALL="$PROJECT_ROOT/$PREBUILT_TARBALL"
  fi
  TARBALL_PATH="$PREBUILT_TARBALL"
else
  echo "Building project..."
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
// Read the package.json of the INSTALLED package, not the source one
const pkg = require("./node_modules/firebase-functions/package.json");
const exports = Object.keys(pkg.exports);

// Filter out non-entrypoint exports if any (like package.json itself sometimes)
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