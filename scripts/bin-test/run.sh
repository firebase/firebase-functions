#!/bin/bash
set -ex # Immediately exit on failure

# Link the Functions SDK for the testing environment.
if [ "$SKIP_BUILD" != "true" ]; then
    npm run build
fi
npm link

# Link the extensions SDKs for the testing environment.
(cd scripts/bin-test/extsdks/local && npm link)
(cd scripts/bin-test/extsdks/translate && npm link)
(cd scripts/bin-test/extsdks/translate && npm link firebase-functions)

# Link SDKs to all test sources.
for f in scripts/bin-test/sources/*; do
    if [ -d "$f" ]; then
        (cd "$f" && npm link firebase-functions)
        (cd "$f" && npm link @firebase-extensions/firebase-firestore-translate-text-sdk)
        (cd "$f" && npm link @firebase-extensions/local-backfill-sdk)
    fi
done

# Make sure firebase-functions binary is executable
chmod +x ./lib/bin/firebase-functions.js

mocha \
  --file ./scripts/bin-test/mocha-setup.ts \
  ./scripts/bin-test/test.ts
