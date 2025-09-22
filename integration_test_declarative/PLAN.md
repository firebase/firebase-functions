# Firebase Functions Integration Test CI/CD Implementation Plan

## Overview
This document outlines the current state and future plans for the Firebase Functions integration test framework using a declarative approach with YAML configurations and Handlebars templates.

## Current State (as of 2025-09-17)

### ✅ Completed Migrations

#### V1 Test Suites (11 suites)
- `v1_firestore` - Firestore document triggers
- `v1_database` - Realtime Database triggers
- `v1_pubsub` - PubSub message handling
- `v1_storage` - Storage object lifecycle
- `v1_tasks` - Cloud Tasks queue operations
- `v1_remoteconfig` - Remote Config updates
- `v1_testlab` - Test Lab matrix completion
- `v1_auth` - Combined auth triggers (onCreate, onDelete)
- `v1_auth_nonblocking` - Non-blocking auth triggers
- `v1_auth_before_create` - beforeCreate blocking function
- `v1_auth_before_signin` - beforeSignIn blocking function

#### V2 Test Suites (11 suites)
- `v2_firestore` - Firestore v2 with namespaces
- `v2_database` - Realtime Database v2 API
- `v2_pubsub` - PubSub v2 with new options
- `v2_storage` - Storage v2 object events
- `v2_tasks` - Tasks v2 with queue options
- `v2_scheduler` - Scheduler v2 with timezone support
- `v2_remoteconfig` - Remote Config v2 API
- `v2_identity` - Identity Platform triggers (replaces v1 auth blocking)
- `v2_alerts` - Firebase Alerts integration
- `v2_eventarc` - EventArc custom events
- `v2_testlab` - Test Lab v2 triggers

### Key Scripts
- `scripts/generate.js` - Generates functions from YAML configs and templates
- `scripts/run-suite.sh` - Runs integration tests for specified suites
- `scripts/cleanup-all-test-users.cjs` - Cleans up test auth users
- `scripts/hard-reset.sh` - Complete project cleanup

### Test Execution
```bash
# Run individual suite
./scripts/run-suite.sh v1_firestore

# Run multiple suites
./scripts/run-suite.sh v1_firestore v1_database v1_pubsub

# Run all v1 tests
./scripts/run-suite.sh v1_*

# Run all v2 tests
./scripts/run-suite.sh v2_*
```

## Phase 1: Cloud Build CI Setup

### 1.1 Cloud Build Configuration Strategy

Create `cloudbuild.yaml` with separate steps per suite for:
- Better visibility of which tests fail
- Parallel execution where possible
- Easier debugging and re-runs
- Granular timeout control

### 1.2 Implementation Approach

Two approaches for CI:

#### Option A: Sequential Suite Execution (Recommended for stability)
- Run each suite as a separate Cloud Build step
- Ensures proper cleanup between suites
- Easier to identify failures
- Total time: ~30-45 minutes

#### Option B: Parallel Execution Groups
- Group non-conflicting suites for parallel execution
- Faster total execution time
- More complex error handling
- Total time: ~15-20 minutes

### 1.3 Suite Grouping for Parallel Execution

If using parallel execution, these groups can run simultaneously:

**Group 1: Data Services**
- v1_firestore, v2_firestore
- v1_database, v2_database

**Group 2: Messaging & Tasks**
- v1_pubsub, v2_pubsub
- v1_tasks, v2_tasks
- v2_scheduler

**Group 3: Storage & Config**
- v1_storage, v2_storage
- v1_remoteconfig, v2_remoteconfig

**Group 4: Auth & Identity**
- v1_auth_* (all auth suites)
- v2_identity

**Group 5: Monitoring & Events**
- v2_alerts
- v2_eventarc
- v1_testlab, v2_testlab

## Phase 2: Cloud Build Implementation

### 2.1 Environment Setup

Required environment variables:
- `PROJECT_ID` - Firebase project ID
- `REGION` - Deployment region (default: us-central1)
- `GOOGLE_APPLICATION_CREDENTIALS` - Service account path

### 2.2 Service Account Requirements

The Cloud Build service account needs:
- Firebase Admin
- Cloud Functions Admin
- Cloud Tasks Admin
- Cloud Scheduler Admin
- Pub/Sub Admin
- Storage Admin
- Firestore/Database Admin

### 2.3 Build Steps Structure

Each test suite step should:
1. Generate functions for the suite
2. Deploy functions
3. Run tests
4. Clean up resources
5. Report results

## Phase 3: Monitoring & Reporting

### 3.1 Test Results Collection
- Store test results in Cloud Storage
- Generate HTML/JSON reports
- Track success/failure rates
- Monitor execution times

### 3.2 Alerting
- Slack notifications for failures
- Email summaries for test runs
- Dashboard for test history

## Phase 4: Documentation Updates

### 4.1 User Guide (`README.md`)
- Quick start guide
- Suite descriptions
- Local development workflow
- Troubleshooting common issues

### 4.2 CI/CD Guide (`docs/CI_SETUP.md`)
- Cloud Build trigger setup
- Environment configuration
- Secret management
- Monitoring setup

### 4.3 Suite Development Guide (`docs/ADDING_SUITES.md`)
- Creating new test suites
- Template development
- Test writing best practices
- Debugging techniques

## Implementation Timeline

### Week 1: Cloud Build Setup
- [x] All V1 and V2 suites migrated
- [ ] Create `cloudbuild.yaml` with individual steps
- [ ] Configure Cloud Build triggers
- [ ] Set up service accounts and permissions

### Week 2: Testing & Optimization
- [ ] Run full test suite in Cloud Build
- [ ] Optimize failing tests
- [ ] Implement retry logic
- [ ] Performance tuning

### Week 3: Monitoring & Documentation
- [ ] Set up monitoring dashboards
- [ ] Configure alerting
- [ ] Write comprehensive documentation
- [ ] Team training

## Success Metrics

1. **Reliability**: 95% pass rate for non-flaky tests
2. **Performance**: Full suite completes in < 45 minutes
3. **Visibility**: Clear reporting of failures with logs
4. **Maintainability**: Easy to add new test suites
5. **Cost**: < $50/day for CI runs

## Known Issues & Limitations

1. **V1 Auth Blocking Functions**: Cannot run in same project as V2 Identity
2. **Cloud Tasks**: Requires queue creation before tests
3. **Scheduler**: May have timing issues in CI environment
4. **TestLab**: Currently skipped due to complexity

## Next Steps

1. Create `cloudbuild.yaml` with separate steps per suite
2. Test Cloud Build configuration locally
3. Set up Cloud Build triggers
4. Document the CI process
5. Train team on new workflow

---

*Last Updated: 2025-09-17*
*Status: Implementation Phase - Cloud Build Setup*