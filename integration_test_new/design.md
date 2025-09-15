# Integration Test Framework Design

## Overview

A simplified, declarative integration test framework for testing the Firebase Functions SDK itself through end-to-end testing. This framework builds the SDK from source, deploys test functions using that build, and verifies the SDK behavior through comprehensive integration tests.

**Note**: This is for testing the Firebase Functions SDK development, not for testing application-level Firebase Functions. The framework replaces the complex TypeScript orchestration with shell scripts and YAML configuration.

## Core Principles

1. **Declarative Configuration** - YAML files define what to test, not how
2. **Shell Script Orchestration** - Simple bash scripts instead of TypeScript
3. **Test Isolation** - Each test run has a unique TEST_RUN_ID
4. **Selective Deployment** - Deploy only the functions needed for specific tests
5. **CI/CD Optimized** - Built for Cloud Build and automated testing

## Architecture

### Directory Structure

```
integration_test_new/
├── functions/                      # Firebase functions to deploy
│   ├── src/
│   │   ├── index.ts               # Main entry with conditional exports
│   │   ├── v1/                    # V1 function implementations
│   │   ├── v2/                    # V2 function implementations
│   │   ├── region.ts              # Region configuration
│   │   └── utils.ts               # Shared utilities
│   ├── package.json               # Generated from template
│   └── tsconfig.json              # TypeScript config
├── tests/                         # Jest tests that trigger functions
│   ├── v1/                        # V1 function tests
│   ├── v2/                        # V2 function tests
│   ├── utils.ts                   # Test utilities
│   └── firebaseSetup.ts          # Firebase initialization
├── scripts/                       # Shell script orchestration
│   ├── build-sdk.sh              # Build Firebase SDK
│   ├── setup-functions.sh        # Prepare functions directory
│   ├── deploy-suite.sh           # Deploy specific test suite
│   ├── run-tests.sh              # Execute Jest tests
│   ├── cleanup.sh                # Remove deployed functions
│   └── test-suite.sh             # Run specific test suite
├── config/
│   ├── test-suites.yaml          # Declarative test configuration
│   ├── package.json.template     # Template for functions package.json
│   └── test-config.sh            # Environment configuration
├── firebase.json                  # Firebase project config
├── database.rules.json            # Realtime Database rules
├── firestore.rules                # Firestore rules
├── firestore.indexes.json         # Firestore indexes
├── jest.config.js                 # Jest configuration
├── package.json                   # Root package with dependencies
├── cloudbuild.yaml               # Cloud Build configuration
└── README.md                      # User documentation
```

## Declarative Configuration

### test-suites.yaml

```yaml
# Define individual test suites
test_suites:
  v1_auth:
    description: "V1 Auth blocking functions"
    function_patterns:  # Use patterns with wildcards for TEST_RUN_ID
      - "authUserOnCreateTests_*"
      - "authUserOnDeleteTests_*"
      - "authUserBeforeCreateTests_*"
      - "authUserBeforeSignInTests_*"
    tests:
      - tests/v1/auth.test.ts
    env:
      AUTH_TEST_MODE: v1_auth

  v2_identity:
    description: "V2 Identity blocking functions"
    function_patterns:
      - "identityBeforeUserCreatedTests_*"
      - "identityBeforeUserSignedInTests_*"
    tests:
      - tests/v2/identity.test.ts
    env:
      AUTH_TEST_MODE: v2_identity

  v1_database:
    description: "V1 Database triggers"
    function_patterns:
      - "databaseRefOnCreateTests_*"
      - "databaseRefOnDeleteTests_*"
      - "databaseRefOnUpdateTests_*"
      - "databaseRefOnWriteTests_*"
    tests:
      - tests/v1/database.test.ts
    env:
      AUTH_TEST_MODE: none

# Define test runs that group suites
test_runs:
  auth_blocking:
    sequential: true  # Run these sequentially due to conflicts
    suites:
      - v1_auth
      - v2_identity

  all_triggers:
    sequential: false  # Can run in parallel
    suites:
      - v1_database
      - v1_firestore
      - v1_storage
      - v2_database
      - v2_firestore
      - v2_storage

  full:
    sequential: true
    suites:
      - v1_auth
      - v2_identity
      - v1_database
      - v1_firestore
      - v1_storage
      - v2_database
      - v2_firestore
      - v2_storage
```

## Test Isolation Strategy

### TEST_RUN_ID

Every test run gets a unique identifier:
- Format: `t<timestamp><hex>` (short to fit function name limits)
- Example: `t1699234567a3f2`
- Set once at test run start via environment variable
- Used in: Function export names, database paths, and logs

### Function Naming Implementation

Functions read TEST_RUN_ID from environment at build time and export with suffix:

```typescript
// functions/src/v1/database-tests.ts
const TEST_RUN_ID = process.env.TEST_RUN_ID || 't_default';

// Export with TEST_RUN_ID suffix for isolation
exports[`databaseOnCreateTests_${TEST_RUN_ID}`] = functions
  .database.ref(`dbTests/${TEST_RUN_ID}/{testId}/start`)
  .onCreate(async (snapshot, context) => {
    // Function implementation
  });
```

This results in deployed function names like:
- `databaseOnCreateTests_t1699234567a3f2`
- `authUserOnCreateTests_t1699234567a3f2`

### Configuration with Patterns

The test-suites.yaml uses function patterns (with wildcards) instead of exact names:

```yaml
test_suites:
  v1_database:
    function_patterns:  # Patterns, not exact names
      - "databaseRefOnCreateTests_*"
      - "databaseRefOnDeleteTests_*"
```

The deploy script replaces wildcards with the actual TEST_RUN_ID at deployment time.

### Database and Storage Paths

All paths include TEST_RUN_ID for complete isolation:
```typescript
// Database path includes TEST_RUN_ID
.database.ref(`dbTests/${TEST_RUN_ID}/{testId}/start`)

// Storage paths include TEST_RUN_ID
.storage.object().onFinalize(`uploads/${TEST_RUN_ID}/{filename}`)

// Firestore collections remain unchanged (data isolation via testId)
.collection("databaseRefOnCreateTests")
.doc(testId)
```

### Cleanup Strategy

Cleanup is simple - delete all resources matching the TEST_RUN_ID:
```bash
# Delete all functions with this TEST_RUN_ID suffix
firebase functions:list | grep "_${TEST_RUN_ID}"

# Delete test data from database
firebase database:remove "/dbTests/${TEST_RUN_ID}"
```

## Shell Scripts

### Main Orchestrator (test-suite.sh)

```bash
#!/bin/bash
set -e

SUITE=${1:-all}
# Generate short TEST_RUN_ID that fits function name limits
export TEST_RUN_ID="${TEST_RUN_ID:-t$(date +%s)$(openssl rand -hex 2)}"

echo "================================================"
echo "Test Run ID: $TEST_RUN_ID"
echo "Test Suite: $SUITE"
echo "Project: $PROJECT_ID"
echo "================================================"

# Load configuration
source config/test-config.sh

# Build SDK if needed
if [ "$BUILD_SDK" = "true" ]; then
  ./scripts/build-sdk.sh
fi

# Parse suite configuration
SUITES=$(yq eval ".test_runs.$SUITE.suites[]" config/test-suites.yaml 2>/dev/null || echo $SUITE)
SEQUENTIAL=$(yq eval ".test_runs.$SUITE.sequential" config/test-suites.yaml 2>/dev/null || echo "true")

# Run suites
for suite in $SUITES; do
  ./scripts/run-single-suite.sh $suite

  if [ "$SEQUENTIAL" = "true" ]; then
    ./scripts/cleanup.sh $suite
  fi
done

# Final cleanup
./scripts/cleanup.sh $TEST_RUN_ID
```

### Deploy Suite (deploy-suite.sh)

```bash
#!/bin/bash
set -e

SUITE=$1
# Get function patterns from config
PATTERNS=$(yq eval ".test_suites.$SUITE.function_patterns[]" config/test-suites.yaml)

echo "Deploying functions for suite: $SUITE"
echo "TEST_RUN_ID: $TEST_RUN_ID"

# Set environment variables from config
eval $(yq eval ".test_suites.$SUITE.env | to_entries | .[] | \"export \" + .key + \"=\" + .value" config/test-suites.yaml)

# Build functions with TEST_RUN_ID in environment
./scripts/setup-functions.sh

# Transform patterns to actual function names
FUNCTIONS=""
for pattern in $PATTERNS; do
  # Replace * with TEST_RUN_ID
  func_name="${pattern/\*/$TEST_RUN_ID}"
  FUNCTIONS="$FUNCTIONS,functions:$func_name"
done
FUNCTIONS="${FUNCTIONS:1}"  # Remove leading comma

echo "Deploying functions: $FUNCTIONS"

# Deploy with retry
retry() {
  local n=1
  local max=3
  while [ $n -le $max ]; do
    echo "Deploy attempt $n/$max..."
    "$@" && return 0
    n=$((n+1))
    [ $n -le $max ] && sleep 10
  done
  return 1
}

# Deploy functions
cd functions
retry firebase deploy --only functions --project $PROJECT_ID --non-interactive
cd ..
```

### Run Tests (run-tests.sh)

```bash
#!/bin/bash
set -e

SUITE=$1
TESTS=$(yq eval ".test_suites.$SUITE.tests[]" config/test-suites.yaml)

echo "Running tests for suite: $SUITE"

# Run each test file
for test in $TESTS; do
  echo "Executing: $test"
  npx jest $test --verbose --runInBand
done
```

## Auth Blocking Function Handling

### Problem
Firebase doesn't allow v1 auth blocking functions (beforeCreate, beforeSignIn) and v2 identity blocking functions (beforeUserCreated, beforeUserSignedIn) to be deployed simultaneously.

### Solution
Use AUTH_TEST_MODE environment variable with conditional exports:

```typescript
// functions/src/index.ts
const authMode = process.env.AUTH_TEST_MODE || "none";

let v1: any;
let v2: any;

if (authMode === "v1_auth") {
  v1 = require("./v1/index-with-auth");
  v2 = require("./v2/index-without-identity");
} else if (authMode === "v2_identity") {
  v1 = require("./v1/index-without-auth");
  v2 = require("./v2/index-with-identity");
} else {
  v1 = require("./v1/index-without-auth");
  v2 = require("./v2/index-without-identity");
}

export { v1, v2 };
```

## CI/CD Integration

### Cloud Build Configuration

```yaml
steps:
  # Build SDK
  - name: 'gcr.io/cloud-builders/npm'
    args: ['run', 'build:pack']
    dir: '..'

  # Install dependencies
  - name: 'gcr.io/cloud-builders/npm'
    args: ['install']
    dir: 'integration_test_new'

  # Run integration tests
  - name: 'gcr.io/cloud-builders/npm'
    env:
      - 'PROJECT_ID=$PROJECT_ID'
      - 'TEST_RUN_ID=build_${BUILD_ID}_${SHORT_SHA}'
      - 'TEST_SUITE=${_TEST_SUITE}'
    args: ['run', 'test:suite', '--', '${_TEST_SUITE}']
    dir: 'integration_test_new'
    timeout: '30m'

substitutions:
  _TEST_SUITE: 'full'  # Default, can override

options:
  logging: CLOUD_LOGGING_ONLY
  machineType: 'E2_HIGHCPU_8'
```

### GitHub Actions Alternative

```yaml
name: Integration Tests
on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        suite: [v1_auth, v2_identity, all_triggers]
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - name: Authenticate to Google Cloud
        uses: google-github-actions/auth@v1
        with:
          credentials_json: ${{ secrets.GCP_SA_KEY }}
      - name: Run tests
        env:
          PROJECT_ID: ${{ secrets.PROJECT_ID }}
          TEST_RUN_ID: gh_${{ github.run_id }}_${{ matrix.suite }}
        run: |
          cd integration_test_new
          npm install
          npm run test:suite -- ${{ matrix.suite }}
```

## Benefits Over Current System

1. **80% Less Code** - Removes complex TypeScript orchestration
2. **Declarative** - YAML configuration instead of code
3. **Debuggable** - Simple bash scripts with `set -x` for debugging
4. **Flexible** - Easy to add new test suites or modify existing ones
5. **Parallel Capable** - Non-conflicting suites can run in parallel
6. **CI/CD Ready** - Works with any CI system that can run bash
7. **No Complex Dependencies** - Just firebase-tools, jest, and yq for YAML

## Migration Path

1. Create `integration_test_new` directory
2. Copy functions with auth mode modifications
3. Copy test files from existing setup
4. Create shell scripts based on this design
5. Create declarative YAML configuration
6. Test with single suite first
7. Validate full test run
8. Update CI/CD pipelines
9. Deprecate old TypeScript-based system

## Future Enhancements

1. **Parallel Execution** - Use GNU parallel for non-conflicting suites
2. **Test Sharding** - Split large test suites across multiple runners
3. **Result Aggregation** - Collect results in structured format
4. **Retry Logic** - Configurable retry policies per suite
5. **Resource Management** - Automatic cleanup of orphaned resources
6. **Performance Metrics** - Track deployment and test execution times