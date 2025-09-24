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

## Prerequisites

Before running integration tests, ensure the Firebase Functions SDK is built and packaged:

```bash
# From the root firebase-functions directory
npm run pack-for-integration-tests
```

This creates `integration_test_declarative/firebase-functions-local.tgz` which is used by all test suites.

### Project Setup

The integration tests require two Firebase projects:
- **V1 Project**: For testing Firebase Functions v1 triggers
- **V2 Project**: For testing Firebase Functions v2 triggers

#### Default Projects (Firebase Team)
The framework uses these projects by default:
- V1: `functions-integration-tests`
- V2: `functions-integration-tests-v2`

#### Custom Projects (External Users)
To use your own projects, you'll need to:

1. **Create Firebase Projects**:
   ```bash
   # Create V1 project
   firebase projects:create your-v1-project-id
   
   # Create V2 project  
   firebase projects:create your-v2-project-id
   ```

2. **Enable Required APIs**:
   ```bash
   # Enable APIs for both projects
   gcloud services enable cloudfunctions.googleapis.com --project=your-v1-project-id
   gcloud services enable cloudfunctions.googleapis.com --project=your-v2-project-id
   gcloud services enable cloudtasks.googleapis.com --project=your-v1-project-id
   gcloud services enable cloudtasks.googleapis.com --project=your-v2-project-id
   gcloud services enable cloudscheduler.googleapis.com --project=your-v2-project-id
   gcloud services enable cloudtestservice.googleapis.com --project=your-v1-project-id
   gcloud services enable cloudtestservice.googleapis.com --project=your-v2-project-id
   ```

3. **Set Up Cloud Build Permissions** (if using Cloud Build):
   ```bash
   # Get your Cloud Build project number
   CLOUD_BUILD_PROJECT_NUMBER=$(gcloud projects describe YOUR_CLOUD_BUILD_PROJECT --format="value(projectNumber)")
   
   # Grant permissions to your V1 project
   gcloud projects add-iam-policy-binding your-v1-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/cloudtasks.admin"
   
   gcloud projects add-iam-policy-binding your-v1-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/cloudscheduler.admin"
   
   gcloud projects add-iam-policy-binding your-v1-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/cloudtestservice.testAdmin"
   
   gcloud projects add-iam-policy-binding your-v1-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/firebase.admin"
   
   # Repeat for your V2 project
   gcloud projects add-iam-policy-binding your-v2-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/cloudtasks.admin"
   
   gcloud projects add-iam-policy-binding your-v2-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/cloudscheduler.admin"
   
   gcloud projects add-iam-policy-binding your-v2-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/cloudtestservice.testAdmin"
   
   gcloud projects add-iam-policy-binding your-v2-project-id \
     --member="serviceAccount:${CLOUD_BUILD_PROJECT_NUMBER}@cloudbuild.gserviceaccount.com" \
     --role="roles/firebase.admin"
   ```

## Quick Start

```bash
# Run all tests sequentially (recommended)
npm run test:all:sequential

# Run all v1 tests sequentially
npm run test:v1:all

# Run all v2 tests sequentially
npm run test:v2:all

# Run tests in parallel (faster but may hit rate limits)
npm run test:v1:all:parallel
npm run test:v2:all:parallel

# Run a single test suite
npm run test:firestore  # Runs v1_firestore

# Clean up after a test run
npm run cleanup

# List saved test artifacts
npm run cleanup:list
```

## Configuration

### Auth Tests Configuration

Auth tests use Firebase client SDK configuration that is hardcoded in `tests/firebaseClientConfig.ts`. This configuration is safe to expose publicly as Firebase client SDK configuration is designed to be public. Security comes from Firebase Security Rules, not config secrecy.

The configuration is automatically used by auth tests and no additional setup is required.

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
│   ├── v1/
│   │   └── suites.yaml   # All v1 suite definitions
│   ├── v2/
│   │   └── suites.yaml   # All v2 suite definitions
│   └── suites.schema.json # YAML schema definition
├── templates/            # Handlebars templates
│   └── functions/
│       ├── package.json.hbs
│       ├── tsconfig.json.hbs
│       └── src/
│           ├── v1/       # V1 function templates
│           └── v2/       # V2 function templates
├── generated/            # Generated code (git-ignored)
│   ├── functions/        # Generated function code
│   │   └── firebase-functions-local.tgz  # SDK tarball (copied)
│   ├── firebase.json     # Generated Firebase config
│   └── .metadata.json    # Generation metadata
├── scripts/
│   ├── generate.js       # Template generation script
│   ├── run-tests.js      # Unified test runner
│   ├── config-loader.js  # YAML configuration loader
│   └── cleanup-suite.sh  # Cleanup utilities
└── tests/               # Jest test files
    ├── v1/              # V1 test suites
    └── v2/              # V2 test suites
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

### 2. SDK Preparation

The Firebase Functions SDK is packaged once:
- Built from source in the parent directory
- Packed as `firebase-functions-local.tgz`
- Copied into each generated/functions directory during generation
- Referenced locally in package.json as `file:firebase-functions-local.tgz`

This ensures the SDK is available during both local builds and Firebase cloud deployments.

### 3. Code Generation

The `generate.js` script:
- Reads the suite YAML configuration from config/v1/ or config/v2/
- Generates a unique TEST_RUN_ID
- Applies Handlebars templates with the configuration
- Outputs static TypeScript code with baked-in TEST_RUN_ID
- Copies the SDK tarball into the functions directory

Generated functions have names like: `firestoreDocumentOnCreateTeststoi5krf7a`

### 4. Deployment & Testing

The `run-tests.js` script orchestrates:
1. **Pack SDK**: Package the SDK once at the start (if not already done)
2. **Generate**: Create function code from templates for each suite
3. **Build**: Compile TypeScript to JavaScript
4. **Deploy**: Deploy to Firebase with unique function names
5. **Test**: Run Jest tests against deployed functions
6. **Cleanup**: Automatic cleanup after each suite (functions and generated files)

### 5. Cleanup

Functions and test data are automatically cleaned up:
- After each suite completes (success or failure)
- Generated directory is cleared and recreated
- Deployed functions are deleted if deployment was successful
- Test data in Firestore/Database is cleaned up

## Commands

### Running Tests
```bash
# Run all tests sequentially
npm run test:all:sequential

# Run specific version tests
npm run test:v1:all           # All v1 tests sequentially
npm run test:v2:all           # All v2 tests sequentially
npm run test:v1:all:parallel  # All v1 tests in parallel
npm run test:v2:all:parallel  # All v2 tests in parallel

# Run individual suites
npm run test:firestore        # Runs v1_firestore
npm run run-tests v1_database # Direct suite name

# Run with options
npm run run-tests -- --sequential v1_firestore v1_database
npm run run-tests -- --filter=v2 --exclude=auth
```

### Generate Functions Only
```bash
npm run generate <suite-name>
```
- Generates function code without deployment
- Useful for debugging templates

### Cleanup Functions
```bash
# Clean up current test run
npm run cleanup

# List saved test artifacts
npm run cleanup:list

# Manual cleanup with cleanup-suite.sh
./scripts/cleanup-suite.sh <TEST_RUN_ID>
./scripts/cleanup-suite.sh --list-artifacts
./scripts/cleanup-suite.sh --clean-artifacts
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

### Local Development
Place your service account key at `sa.json` in the root directory. This file is git-ignored.

### Cloud Build
Cloud Build uses Application Default Credentials (ADC) automatically. However, the Cloud Build service account requires specific permissions for the Google Cloud services used in tests:

**Required IAM Roles for Cloud Build Service Account:**
- `roles/cloudtasks.admin` - For Cloud Tasks integration tests
- `roles/cloudscheduler.admin` - For Cloud Scheduler integration tests  
- `roles/cloudtestservice.testAdmin` - For Firebase Test Lab integration tests
- `roles/firebase.admin` - For Firebase services (already included)
- `roles/pubsub.publisher` - For Pub/Sub integration tests (already included)

**Multi-Project Setup:**
Tests deploy to multiple projects (typically one for V1 tests and one for V2 tests). The Cloud Build service account needs the above permissions on **all target projects**:

```bash
# Grant permissions to each target project
gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
  --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudtasks.admin"

gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
  --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudscheduler.admin"

gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
  --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/cloudtestservice.testAdmin"

gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
  --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
  --role="roles/firebase.admin"
```

Replace:
- `TARGET_PROJECT_ID` with each project where tests will be deployed
- `CLOUD_BUILD_PROJECT_NUMBER` with the project number where Cloud Build runs

#### Running Cloud Build with Custom Projects

To use your own projects, edit the YAML configuration files:

1. **Edit V1 project ID**: Update `config/v1/suites.yaml`:
   ```yaml
   defaults:
     projectId: your-v1-project-id
   ```

2. **Edit V2 project ID**: Update `config/v2/suites.yaml`:
   ```yaml
   defaults:
     projectId: your-v2-project-id
   ```

3. **Run Cloud Build**:
   ```bash
   gcloud builds submit --config=integration_test/cloudbuild.yaml
   ```

**Default behavior (Firebase team):**
The YAML files are pre-configured with:
- V1 tests: `functions-integration-tests`
- V2 tests: `functions-integration-tests-v2`

## Test Isolation

Each test run gets a unique TEST_RUN_ID that:
- Is embedded in function names at generation time
- Isolates test data in collections/paths
- Enables parallel test execution
- Allows complete cleanup after tests

Format: `t_<timestamp>_<random>` (e.g., `t_1757979490_xkyqun`)

## Troubleshooting

### SDK Tarball Not Found
- Run `npm run pack-for-integration-tests` from the root firebase-functions directory
- This creates `integration_test_declarative/firebase-functions-local.tgz`
- The SDK is packed once and reused for all suites

### Functions Not Deploying
- Check that the SDK tarball exists and was copied to generated/functions/
- Verify project ID in suite YAML configuration
- Ensure Firebase CLI is authenticated: `firebase projects:list`
- Check deployment logs for specific errors

### Deployment Fails with "File not found" Error
- The SDK tarball must be in generated/functions/ directory
- Package.json should reference `file:firebase-functions-local.tgz` (local path)
- Run `npm run generate <suite>` to regenerate with correct paths

### Tests Failing
- Verify `sa.json` exists in integration_test_declarative/ directory
- Check that functions deployed successfully: `firebase functions:list --project <project-id>`
- Ensure TEST_RUN_ID environment variable is set
- Check test logs in logs/ directory

### Permission Errors in Cloud Build
If you see authentication errors like "Could not refresh access token" or "Permission denied":
- Verify Cloud Build service account has required IAM roles on all target projects
- Check project numbers: `gcloud projects describe PROJECT_ID --format="value(projectNumber)"`
- Grant missing permissions to each target project:
  ```bash
  # For Cloud Tasks
  gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
    --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/cloudtasks.admin"
  
  # For Cloud Scheduler  
  gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
    --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/cloudscheduler.admin"
  
  # For Test Lab
  gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
    --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/cloudtestservice.testAdmin"
  
  # For Firebase services
  gcloud projects add-iam-policy-binding TARGET_PROJECT_ID \
    --member="serviceAccount:CLOUD_BUILD_PROJECT_NUMBER@cloudbuild.gserviceaccount.com" \
    --role="roles/firebase.admin"
  ```

### Cleanup Issues
- Use `npm run cleanup:list` to find orphaned test runs
- Manual cleanup: `firebase functions:delete <function-name> --project <project-id> --force`
- Check for leftover test functions: `firebase functions:list --project PROJECT_ID | grep Test`
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