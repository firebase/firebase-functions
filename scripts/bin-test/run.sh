#!/bin/bash
set -ex # Immediately exit on failure

# Globally link the locally built Functions SDK for the testing framework.
npm run build
./scripts/bin-test/npm-link.sh

# Link local SDK to all test sources.
for f in scripts/bin-test/sources/*; do
    if [ -d "$f" ]; then
        (cd "$f" && npm link firebase-functions)
    fi
done

## DEBUG
ls -la scripts/bin-test/sources/commonjs/node_modules

mocha \
  --file ./scripts/bin-test/mocha-setup.ts \
  ./scripts/bin-test/test.ts
