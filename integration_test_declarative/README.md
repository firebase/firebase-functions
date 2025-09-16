# Firebase Functions Declarative Integration Test Framework

## Overview

This framework provides a declarative approach to Firebase Functions integration testing. It solves the critical issue of Firebase CLI's inability to discover dynamically-named functions by generating static function code from templates at build time rather than runtime.

### Problem Solved

The original integration tests used runtime TEST_RUN_ID injection for function isolation, which caused Firebase CLI deployment failures:
- Dynamic CommonJS exports couldn't be re-exported through ES6 modules
- Firebase CLI requires static function names at deployment time
- Runtime function naming prevented proper function discovery

### Solution

This framework uses a template-based code generation approach where:
1. Test suites are defined declaratively in YAML
2. Functions are generated from Handlebars templates with TEST_RUN_ID baked in
3. Generated code has static exports that Firebase CLI can discover
4. Each test run gets isolated function instances

## Quick Start

```bash
# Run all v1 tests (generate, deploy, test)
npm run test:v1:all

# Run a single test suite
./scripts/run-suite.sh v1_firestore

# Run with artifact saving (for later cleanup)
./scripts/run-suite.sh v1_firestore --save-artifact

# Clean up after a test run
./scripts/cleanup-suite.sh

# Clean up a specific test run
./scripts/cleanup-suite.sh t_1757979490_xkyqun
```

## Configuration

### Auth Tests Configuration

Auth tests require Firebase client SDK credentials. Create a `test-config.json` file in the project root:

```bash
cp test-config.json.example test-config.json
# Edit test-config.json with your Firebase project credentials
```

You can get these values from the Firebase Console:
1. Go to Project Settings → General
2. Scroll down to "Your apps" → Web app
3. Copy the configuration values

The file is already in `.gitignore` to prevent accidental commits.

### Auth Blocking Functions Limitation

Firebase has a limitation where **only ONE blocking auth function can be deployed per project at any time**. This means:
- You cannot deploy `beforeCreate` and `beforeSignIn` together
- You cannot run these tests in parallel with other test runs
- Each blocking function must be tested separately

To work around this:
- `npm run test:v1:all` - Runs all v1 tests with non-blocking auth functions only (onCreate, onDelete)
- `npm run test:v1:auth-before-create` - Tests ONLY the beforeCreate blocking function (run separately)
- `npm run test:v1:auth-before-signin` - Tests ONLY the beforeSignIn blocking function (run separately)

**Important**: Run the blocking function tests one at a time, and ensure no other test deployments are running.

## Architecture

```
integration_test_declarative/
├── config/
│   ├── suites/           # YAML suite definitions
│   │   └── v1_firestore.yaml
│   └── templates/        # Handlebars templates
│       ├── functions/
│       │   ├── index.ts.hbs
│       │   └── firestore/
│       │       └── onCreate.ts.hbs
│       └── firebase.json.hbs
├── generated/            # Generated code (git-ignored)
│   ├── functions/        # Generated function code
│   ├── firebase.json     # Generated Firebase config
│   └── .metadata.json    # Generation metadata
├── scripts/
│   ├── generate.js       # Template generation script
│   ├── run-suite.sh      # Full test orchestration
│   └── cleanup-suite.sh  # Cleanup utilities
└── tests/               # Jest test files
    └── v1/
        └── firestore.test.ts
```

## How It Works

### 1. Suite Definition (YAML)

Each test suite is defined in a YAML file specifying:
- Project ID for deployment
- Functions to generate
- Trigger types and paths

```yaml
suite:
  name: v1_firestore
  projectId: functions-integration-tests
  region: us-central1
  functions:
    - name: firestoreDocumentOnCreateTests
      trigger: onCreate
      document: "tests/{testId}"
```

### 2. Code Generation

The `generate.js` script:
- Reads the suite YAML configuration
- Generates a unique TEST_RUN_ID
- Applies Handlebars templates with the configuration
- Outputs static TypeScript code with baked-in TEST_RUN_ID

Generated functions have names like: `firestoreDocumentOnCreateTests_t_1757979490_xkyqun`

### 3. Deployment & Testing

The `run-suite.sh` script orchestrates:
1. **Generate**: Create function code from templates
2. **Build**: Compile TypeScript to JavaScript
3. **Deploy**: Deploy to Firebase with unique function names
4. **Test**: Run Jest tests against deployed functions
5. **Cleanup**: Automatic cleanup on exit (success or failure)

### 4. Cleanup

Functions and test data are automatically cleaned up:
- On test completion (via bash trap)
- Manually via `cleanup-suite.sh`
- Using saved artifacts for orphaned deployments

## Commands

### Run Test Suite
```bash
./scripts/run-suite.sh <suite-name> [--save-artifact]
```
- Runs complete test flow: generate → build → deploy → test → cleanup
- `--save-artifact` saves metadata for future cleanup

### Generate Functions Only
```bash
npm run generate <suite-name>
```
- Generates function code without deployment
- Useful for debugging templates

### Cleanup Functions
```bash
# Clean current deployment
./scripts/cleanup-suite.sh

# Clean specific test run
./scripts/cleanup-suite.sh <TEST_RUN_ID>

# List saved artifacts
./scripts/cleanup-suite.sh --list-artifacts

# Clean all saved test runs
./scripts/cleanup-suite.sh --clean-artifacts

# Clean by pattern
./scripts/cleanup-suite.sh --pattern <pattern> <project-id>
```

## Adding New Test Suites

### 1. Create Suite Configuration

Create `config/suites/your_suite.yaml`:
```yaml
suite:
  name: your_suite
  projectId: your-project-id
  region: us-central1
  functions:
    - name: yourFunctionName
      trigger: yourTrigger
      # Add trigger-specific configuration
```

### 2. Create Templates (if needed)

Add templates in `config/templates/functions/` for new trigger types.

### 3. Add Test File

Create `tests/your_suite.test.ts` with Jest tests.

### 4. Update run-suite.sh

Add test file mapping in the case statement (lines 175-199).

## Environment Variables

- `PROJECT_ID`: Default project ID (overridden by suite config)
- `TEST_RUN_ID`: Unique identifier for test isolation (auto-generated)
- `GOOGLE_APPLICATION_CREDENTIALS`: Path to service account JSON

## Authentication

Place your service account key at `sa.json` in the root directory. This file is git-ignored.

## Test Isolation

Each test run gets a unique TEST_RUN_ID that:
- Is embedded in function names at generation time
- Isolates test data in collections/paths
- Enables parallel test execution
- Allows complete cleanup after tests

Format: `t_<timestamp>_<random>` (e.g., `t_1757979490_xkyqun`)

## Troubleshooting

### Functions Not Deploying
- Check that templates generate valid TypeScript
- Verify project ID in suite YAML
- Ensure Firebase CLI is authenticated

### Tests Failing
- Verify `sa.json` exists with proper permissions
- Check that functions deployed successfully
- Ensure TEST_RUN_ID environment variable is set

### Cleanup Issues
- Use `--list-artifacts` to find orphaned test runs
- Manual cleanup: `firebase functions:delete <function-name> --project <project-id>`
- Check Firestore/Database console for orphaned test data

## Benefits

1. **Reliable Deployment**: Static function names ensure Firebase CLI discovery
2. **Test Isolation**: Each run has unique function instances
3. **Automatic Cleanup**: No manual cleanup needed
4. **Declarative Configuration**: Easy to understand and maintain
5. **Template Reuse**: Common patterns extracted to templates
6. **Parallel Execution**: Multiple test runs can execute simultaneously

## Limitations

- Templates must be created for each trigger type
- Function names include TEST_RUN_ID (longer names)
- Requires build step before deployment

## Contributing

To add support for new Firebase features:
1. Add trigger templates in `config/templates/functions/`
2. Update suite YAML schema as needed
3. Add corresponding test files
4. Update generation script if new patterns are needed