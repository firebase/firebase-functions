# Firebase Functions Integration Test CI/CD Implementation Plan

## Overview
This document outlines the plan for completing the migration of Firebase Functions integration tests to a declarative framework and setting up automated CI/CD using Google Cloud Build.

## Current State
- ✅ V1 services migrated to declarative framework
- ✅ Multi-suite generation and deployment working
- ✅ Cleanup mechanisms in place (functions, Firestore, auth users)
- ⏳ V2 services need migration
- ⏳ Cloud Build CI/CD setup needed
- ⏳ Documentation needed

## Phase 1: Complete V2 Test Migration

### 1.1 Migrate V2 Services to Declarative Framework
Each service needs:
- Handlebars template in `templates/functions/src/v2/`
- YAML suite configuration in `config/suites/`
- Test file in `tests/v2/`

Services to migrate:
- [x] **Firestore V2** - Document triggers with namespaces
- [x] **Database V2** - Realtime database with new API
- [x] **PubSub V2** - Topic and message handling
- [x] **Storage V2** - Object lifecycle events
- [x] **Tasks V2** - Task queue with new options
- [x] **Scheduler V2** - Cron jobs with timezone support
- [x] **RemoteConfig V2** - Configuration updates
- [x] **TestLab V2** - Test matrix completion
- [x] **Identity V2** - Replaces Auth with beforeUserCreated/beforeUserSignedIn
- [x] **EventArc V2** - Custom event handling
- [x] **Alerts V2** - Firebase Alerts integration (if needed)

### 1.2 Project Setup Strategy

#### Two Separate Projects Required
- **V1 Project**: `functions-integration-tests` (existing)
  - Uses Firebase Auth with `auth.onCreate`, `auth.onDelete`, `auth.beforeCreate`, `auth.beforeSignIn`
  - Node.js 18 runtime
  - 1st gen Cloud Functions

- **V2 Project**: `functions-integration-tests-v2` (new)
  - Uses Identity Platform with `identity.beforeUserCreated`, `identity.beforeUserSignedIn`
  - Node.js 18+ runtime
  - 2nd gen Cloud Functions
  - Reason: V2 blocking functions conflict with V1 auth blocking functions

## Phase 2: Cloud Build CI Setup

### 2.1 Cloud Build Configuration (`cloudbuild.yaml`)

```yaml
steps:
  # Install dependencies
  - name: 'node:18'
    entrypoint: 'npm'
    args: ['ci']

  # Run V1 tests
  - name: 'gcr.io/firebase-tools'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        export PROJECT_ID=functions-integration-tests
        ./scripts/run-ci-tests.sh v1

  # Run V2 tests (separate project)
  - name: 'gcr.io/firebase-tools'
    entrypoint: 'bash'
    args:
      - '-c'
      - |
        export PROJECT_ID=functions-integration-tests-v2
        ./scripts/run-ci-tests.sh v2

  # Generate and store test report
  - name: 'node:18'
    entrypoint: 'bash'
    args: ['./scripts/generate-test-report.sh']

timeout: '3600s'
options:
  machineType: 'E2_HIGHCPU_8'
```

### 2.2 CI Orchestration Script (`scripts/run-ci-tests.sh`)

Features needed:
- Sequential execution of test suites
- Proper error handling and aggregation
- Test result artifact storage
- Comprehensive cleanup on success or failure

## Phase 3: Documentation

### 3.1 Project Setup Guide (`docs/PROJECT_SETUP.md`)

Must document:
- Creating Firebase projects for V1 and V2
- Enabling required Firebase services:
  - Firestore
  - Realtime Database
  - Cloud Storage
  - Cloud Functions
  - Cloud Tasks
  - Cloud Scheduler
  - Pub/Sub
  - Remote Config
  - Test Lab
  - Identity Platform (V2 only)
  - Eventarc (V2 only)
- Service account creation with proper roles:
  - Firebase Admin
  - Cloud Functions Admin
  - Cloud Tasks Admin
  - Pub/Sub Admin
  - Storage Admin
- API enablement checklist
- Firebase client SDK configuration (`test-config.json`)
- Authentication setup for client-side tests

### 3.2 CI/CD Setup Guide (`docs/CI_SETUP.md`)

Must document:
- Cloud Build trigger configuration (manual trigger)
- Required environment variables:
  - `FIREBASE_API_KEY`
  - `FIREBASE_AUTH_DOMAIN`
  - `FIREBASE_PROJECT_ID`
  - Service account credentials
- Secrets management using Google Secret Manager
- IAM roles required for Cloud Build service account
- Monitoring test runs in Cloud Build console
- Debugging failed tests from logs

### 3.3 Local Development Guide (`docs/LOCAL_DEVELOPMENT.md`)

Must document:
- Prerequisites and setup
- Running individual test suites
- Running full V1 or V2 test suites
- Debugging test failures
- Adding new test suites
- Creating new templates
- Testing template changes
- Manual cleanup procedures

## Phase 4: Implementation Details

### 4.1 Resource Management

#### Cleanup Strategy
- **Immediate**: Clean up after each test run via trap in bash
- **Daily**: Scheduled Cloud Function to clean orphaned resources
- **Manual**: Scripts for emergency cleanup:
  - `cleanup-all-test-users.cjs` - Remove all test auth users
  - `hard-reset.sh` - Complete project cleanup

#### Cost Control
- Automatic resource cleanup
- Function timeout limits (540s default)
- Cloud Build timeout (1 hour)
- Daily cost monitoring alerts

### 4.2 Error Handling

- Retry mechanism for flaky tests (3 attempts)
- Detailed error logging with test context
- Failed test artifacts saved to Cloud Storage
- Slack/email notifications for CI failures

### 4.3 Security Considerations

- Service accounts with minimal required permissions
- Secrets stored in Google Secret Manager
- No hardcoded credentials in code
- Separate projects for isolation
- Regular security audits of test code

## Phase 5: Testing & Validation

### 5.1 End-to-End Testing
- [ ] Run full V1 suite in Cloud Build
- [ ] Run full V2 suite in Cloud Build
- [ ] Verify cleanup works properly
- [ ] Test failure scenarios
- [ ] Validate reporting accuracy

### 5.2 Performance Benchmarks
- Target: < 30 minutes for full suite
- Measure and optimize:
  - Function deployment time
  - Test execution time
  - Cleanup time
  - Resource usage

## Implementation Timeline

### Week 1-2: V2 Migration
- Migrate all V2 services to declarative framework
- Create and configure V2 project
- Test each V2 service individually

### Week 3: CI/CD Setup
- Create Cloud Build configuration
- Write CI orchestration scripts
- Set up manual triggers
- Configure secrets and permissions

### Week 4: Documentation & Testing
- Write comprehensive documentation
- End-to-end testing
- Performance optimization
- Team training

## Success Criteria

1. **All tests migrated**: V1 and V2 tests using declarative framework
2. **CI/CD operational**: Manual trigger runs all tests successfully
3. **Proper cleanup**: No resource leaks after test runs
4. **Documentation complete**: Setup reproducible by other team members
5. **Performance targets met**: Full suite runs in < 30 minutes
6. **Error handling robust**: Failed tests don't block CI pipeline

## Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Blocking function conflicts | Separate V1 and V2 projects |
| Resource leaks | Multiple cleanup mechanisms |
| Test flakiness | Retry logic and better error handling |
| Long execution times | Parallel execution where possible |
| Secret exposure | Google Secret Manager usage |
| Cost overruns | Resource limits and monitoring |

## Next Steps

1. Review and approve this plan
2. Create V2 project in Firebase Console
3. Begin V2 service migration
4. Implement CI/CD pipeline
5. Document everything
6. Deploy to production

---

*Last Updated: 2025-09-16*
*Status: Planning Phase*