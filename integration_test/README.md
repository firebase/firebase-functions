# Integration Test Suite

## How to use

### Prerequisites

Tests use locally installed firebase to invoke commands for deploying function.
The test also requires that you have gcloud CLI installed and authenticated
(`gcloud auth login`).

Tests are deployed with a unique identifier, which enables the teardown of its own resources, without affecting other test runs.

1. Add a service account at root serviceAccount.json
2. Add a .env `cp .env.example .env`

### Running setup and tests

This will deploy functions with unique names, set up environment for running the
jest files, and run the jest test suite.

```bash
yarn start
```

## TODO

[x] Deploy functions with unique name
[x] Update existing tests to use jest (v1 and v2)
[] Add missing coverage for v1 and v2 (WIP)
[] Ensure proper teardown of resources (only those for current test run)
[] Python runtime support
[] Capture test outcome for use by CI
