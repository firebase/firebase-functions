# Implementation Tasks

## Prerequisites
- [ ] Install required tools
  - [ ] Install `yq` for YAML parsing: `brew install yq` (macOS) or `snap install yq` (Linux)
  - [ ] Install `firebase-tools` globally: `npm install -g firebase-tools`
  - [ ] Install `jest` and TypeScript dependencies (handled by package.json)
  - [ ] Ensure `gcloud` CLI is installed and authenticated
- [ ] Verify environment
  - [ ] Set PROJECT_ID environment variable
  - [ ] Authenticate with Firebase: `firebase login`
  - [ ] Verify access to test project

## Phase 1: Setup and Structure
- [ ] Create directory structure for integration_test_new
  - [ ] Create functions/, tests/, scripts/, config/ directories
  - [ ] Create empty placeholder files for structure
- [ ] Copy Firebase configuration files from existing setup
  - [ ] Copy firebase.json
  - [ ] Copy database.rules.json
  - [ ] Copy firestore.rules
  - [ ] Copy firestore.indexes.json
- [ ] Copy package.json.template from existing setup
- [ ] Create root package.json with minimal dependencies
  - [ ] Add jest, ts-jest, typescript, firebase-admin
  - [ ] Add test scripts
- [ ] Create jest.config.js for test configuration

## Phase 2: Functions Setup
- [ ] Copy functions/src directory from existing setup
  - [ ] Copy all v1/*.ts files
  - [ ] Copy all v2/*.ts files
  - [ ] Copy region.ts and utils.ts
- [ ] Copy functions/tsconfig.json
- [ ] Copy functions/.npmrc
- [ ] Create conditional export index files
  - [ ] Create v1/index-with-auth.ts
  - [ ] Create v1/index-without-auth.ts
  - [ ] Create v2/index-with-identity.ts
  - [ ] Create v2/index-without-identity.ts
- [ ] Update functions/src/index.ts with AUTH_TEST_MODE logic
- [ ] Add TEST_RUN_ID support to all function files
  - [ ] Add `const TEST_RUN_ID = process.env.TEST_RUN_ID || 't_default';` at top of each test file
  - [ ] Update function exports to use dynamic names: `exports[\`functionName_${TEST_RUN_ID}\`] = ...`
  - [ ] Update database paths to include TEST_RUN_ID: `.ref(\`dbTests/${TEST_RUN_ID}/{testId}/start\`)`
  - [ ] Update storage paths to include TEST_RUN_ID where applicable

## Phase 3: Test Files
- [ ] Copy tests directory from existing setup
  - [ ] Copy all tests/v1/*.test.ts files
  - [ ] Copy all tests/v2/*.test.ts files
  - [ ] Copy tests/utils.ts
  - [ ] Copy tests/firebaseSetup.ts
- [ ] Update test files to use TEST_RUN_ID from environment
- [ ] Verify test files work with new structure

## Phase 4: Configuration Files
- [ ] Create config/test-suites.yaml with declarative test configuration
  - [ ] Define v1_auth suite with function_patterns (not exact names)
  - [ ] Define v2_identity suite with function_patterns
  - [ ] Define v1_database suite with function_patterns
  - [ ] Define v1_firestore suite with function_patterns
  - [ ] Define v1_storage suite with function_patterns
  - [ ] Define v2_database suite with function_patterns
  - [ ] Define v2_firestore suite with function_patterns
  - [ ] Define v2_storage suite with function_patterns
  - [ ] Define test_runs groupings (auth_blocking, all_triggers, full)
  - [ ] Use wildcards in patterns: `"functionName_*"` for TEST_RUN_ID substitution
- [ ] Create config/test-config.sh with environment defaults
  - [ ] Set default PROJECT_ID handling
  - [ ] Set default region
  - [ ] Set default Node version
  - [ ] Add utility functions (retry, logging)

## Phase 5: Shell Scripts - Core
- [ ] Create scripts/test-config.sh
  ```bash
  # Verify required environment variables
  # Set defaults for optional variables
  # Export common functions (retry, logging)
  ```
- [ ] Create scripts/build-sdk.sh
  ```bash
  # Navigate to parent directory (../../)
  # Run npm run build:pack to build SDK from source
  # Move generated firebase-functions-*.tgz to integration_test_new/
  # Rename to consistent name: firebase-functions-local.tgz
  ```
- [ ] Create scripts/setup-functions.sh
  ```bash
  # Accept AUTH_TEST_MODE parameter
  # TEST_RUN_ID already in environment from parent script
  # Generate package.json from template
  # Replace __SDK_TARBALL__ with ../firebase-functions-local.tgz
  # Replace __NODE_VERSION__ with value from config
  # cd functions && npm install
  # npm run build (compiles TypeScript with TEST_RUN_ID in env)
  ```

## Phase 6: Shell Scripts - Deployment
- [ ] Create scripts/deploy-suite.sh
  ```bash
  # Accept suite name parameter
  # Parse test-suites.yaml to get function_patterns
  # Transform patterns by replacing * with $TEST_RUN_ID
  # Build comma-separated list: functions:name1,functions:name2
  # Set environment variables from suite config
  # Call setup-functions.sh
  # Deploy with firebase deploy --only $FUNCTIONS
  # Add retry logic (3 attempts with exponential backoff)
  ```
- [ ] Create scripts/cleanup.sh
  ```bash
  # Accept TEST_RUN_ID as parameter
  # List all functions: firebase functions:list
  # Filter for functions ending with _${TEST_RUN_ID}
  # Delete matching functions with firebase functions:delete --force
  # Clean up test data: firebase database:remove "/dbTests/${TEST_RUN_ID}"
  # Clean up storage: gsutil rm -r gs://bucket/uploads/${TEST_RUN_ID}
  ```

## Phase 7: Shell Scripts - Test Execution
- [ ] Create scripts/run-tests.sh
  ```bash
  # Accept suite name parameter
  # Parse test-suites.yaml to get test files
  # Set TEST_RUN_ID in environment
  # Run jest with specified test files
  # Capture and report results
  ```
- [ ] Create scripts/run-single-suite.sh
  ```bash
  # Accept suite name parameter
  # Call deploy-suite.sh
  # Call run-tests.sh
  # Handle errors and cleanup on failure
  ```
- [ ] Create scripts/test-suite.sh (main orchestrator)
  ```bash
  # Accept suite or test_run name
  # Parse test-suites.yaml for configuration
  # Handle sequential vs parallel execution
  # Call run-single-suite.sh for each suite
  # Perform final cleanup
  ```

## Phase 8: CI/CD Integration
- [ ] Create cloudbuild.yaml
  - [ ] Add step to build SDK
  - [ ] Add step to install dependencies
  - [ ] Add step to run test suite
  - [ ] Configure substitutions for test suite selection
- [ ] Create GitHub Actions workflow (optional)
  - [ ] Add job for running tests
  - [ ] Add matrix strategy for parallel suites
  - [ ] Add authentication step
- [ ] Add npm scripts to root package.json
  - [ ] test:suite script that calls test-suite.sh
  - [ ] test:all script for full test run
  - [ ] test:auth script for auth-only tests

## Phase 9: Testing and Validation
- [ ] Test build-sdk.sh script in isolation
- [ ] Test setup-functions.sh with different AUTH_TEST_MODE values
- [ ] Test single suite deployment and execution
  - [ ] Test v1_database suite (no auth conflicts)
  - [ ] Test v1_auth suite
  - [ ] Test v2_identity suite
- [ ] Test cleanup.sh functionality
- [ ] Test full sequential run with auth mode switching
- [ ] Test Cloud Build integration with test project
- [ ] Verify TEST_RUN_ID isolation works correctly

## Phase 10: Documentation and Cleanup
- [ ] Create README.md with usage instructions
- [ ] Document environment variables needed
- [ ] Document how to add new test suites
- [ ] Document troubleshooting steps
- [ ] Add comments to shell scripts
- [ ] Remove any temporary/debug code
- [ ] Create migration guide from old system

## Bonus: Optimizations
- [ ] Add parallel execution support for non-conflicting suites
- [ ] Add test result aggregation and reporting
- [ ] Add performance metrics collection
- [ ] Add automatic retry for flaky tests
- [ ] Add resource usage monitoring
- [ ] Create dashboard for test results

## Dependencies
- `yq` - For parsing YAML files in bash
- `firebase-tools` - For deploying functions
- `jest` - For running tests
- `typescript` - For compiling functions
- `firebase-admin` - For test assertions

## Success Criteria
- [ ] All existing tests pass with new framework
- [ ] Test execution time is same or better than current system
- [ ] Code complexity reduced by >50%
- [ ] Easy to add new test suites via YAML
- [ ] Works reliably in Cloud Build
- [ ] TEST_RUN_ID provides proper isolation
- [ ] Auth blocking functions can be tested sequentially