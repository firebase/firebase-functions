# Integration Test Suite

## How to use

### Prerequisites

Tests use locally installed firebase to invoke commands for deploying functions.
The tests also require that you have gcloud CLI installed and authenticated
(`gcloud auth login`).

Tests are deployed with a unique identifier, which enables the teardown of its own resources, without affecting other test runs.

1. Add a service account at root serviceAccount.json
2. Add a .env `cp .env.example .env`
3. Ensure service account has required roles for each cloud service
4. Ensure any resources such as eventarc channel ("firebase" is used as default) are configured

### Running setup and tests

This will deploy functions with unique names, set up environment for running the jest files, and run the jest test suite.

```bash
yarn start
```

## TODO

[x] Deploy functions with unique name
[x] Update existing tests to use jest (v1 and v2)
[x] Add missing coverage for v1 and v2 (WIP)
[x] Ensure proper teardown of resources (only those for current test run)
[] Analytics: since you cannot directly trigger onLog events from Firebase Analytics in a CI environment, the primary strategy is to isolate and test the logic within the Cloud Functions by mocking Firebase services and the Analytics event data. This is done elsewhere via unit tests, so no additional coverage added.
[] Alerts: same as analytics, couldn't find way to trigger.
[] Auth blocking functions can only be deployed one at a time, half-way solution is to deploy v1 functions, run v1 tests, teardown, and repeat for v2. However, this still won't allow for multiple runs to happen in parallel. Solution needed before re-enabling auth/identity tests. You can run the suite with either v1 or v2 commented out to check test runs.
[] Https tests were commented out previously, comments remain as before
[] Python runtime support

## Troubleshooting

- Sometimes I ran into this reported [issue](https://github.com/firebase/firebase-tools/issues/793), I had to give it some period of time and attempt deploy again. Probably an upstream issue but may affect our approach here. Seems to struggle with deploying the large amount of trigger functions...? Falls over on Firebase Storage functions (if you comment these out everything else deploys as expected).
