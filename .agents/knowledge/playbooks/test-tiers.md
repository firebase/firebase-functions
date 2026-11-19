---
type: Playbook
title: Test tiers and what reviewers expect from tests
description: "Unit specs run offline under mocha, the discovery tests run the built SDK through the `firebase-functions` binary, the packaging tests install the packed tarball, and the post-merge suite deploys to a real project and runs only by hand."
tags: [tests, ci, mocha]
agents_md: when-touching
governs:
  - spec/**
  - mocha/**
  - .mocharc.yaml
  - scripts/bin-test/**
  - scripts/test-packaging.sh
  - integration_test/**
  - .github/workflows/test.yaml
  - .github/workflows/postmerge.yaml
sources:
  - id: package-scripts
    resource: ../../../package.json
    symbol: '"test:postmerge"'
    title: The test scripts
  - id: mocha-setup
    resource: ../../../mocha/setup.ts
    symbol: nock.disableNetConnect()
    title: The unit-test setup, which blocks network access
  - id: test-workflow
    resource: ../../../.github/workflows/test.yaml
    symbol: "npm run test:bin"
    title: The CI Tests workflow and its jobs
  - id: postmerge-workflow
    resource: ../../../.github/workflows/postmerge.yaml
    symbol: workflow_dispatch
    title: The post-merge workflow, started by hand
  - id: bin-run
    resource: ../../../scripts/bin-test/run.sh
    symbol: npm link
    title: The discovery test runner
  - id: bin-test
    resource: ../../../scripts/bin-test/test.ts
    symbol: DEFAULT_OPTIONS
    title: The discovery tests and the manifest defaults they expect
  - id: integration-run
    resource: ../../../integration_test/run_tests.sh
    symbol: GCLOUD_PROJECT
    title: The post-merge runner, which needs a real project
  - id: test-packaging
    resource: ../../../scripts/test-packaging.sh
    symbol: verify-exports.mjs
    title: The packaging tests
  - id: params-index
    resource: ../../../src/params/index.ts
    symbol: export function clearParams
    title: "`clearParams`, which resets declared params"
---

# Where it lives

- Enforced by: the CI Tests workflow, on every push and pull request. Its `lint` job runs only on pull requests.[^test-workflow]
- The test scripts: `test`, `test:bin`, `test:packaging` and `test:postmerge` in `package.json`.[^package-scripts]
- The unit-test setup, which calls `disableNetConnect`: `mocha/setup.ts`.[^mocha-setup]
- The discovery tests and the manifest defaults they expect: `DEFAULT_OPTIONS` in `scripts/bin-test/test.ts`.[^bin-test][^bin-run]
- The post-merge suite: `postmerge.yaml` and `integration_test/run_tests.sh`.[^postmerge-workflow][^integration-run]

# When to use

Before you decide which tests to run or write for a change.

# Steps

1. **Unit specs, always.** `npm test` runs `spec/**/*.spec.ts`. Network access is blocked, so mock HTTP with `nock`.[^mocha-setup] Run one file with `npx mocha --file ./mocha/setup.ts spec/<path>.spec.ts`.
2. **Discovery, when you touch the manifest, `src/bin`, `src/runtime` or a provider's endpoint.** `npm run test:bin` builds the SDK, links it into the test sources with `npm link`, and checks the manifest the binary emits in CommonJS and ESM.[^bin-run] In CI this is the job named `integration`, not the `integration_test/` folder.[^test-workflow] When you change a default the manifest emits, update `DEFAULT_OPTIONS` there.[^bin-test]
3. **Packaging, when you touch `package.json` exports, the build or an entry point.** `npm run test:packaging`.[^test-packaging] See [Add a provider or a package subpath](/playbooks/add-provider-or-subpath.md).
4. **Post-merge, only when the user asks.** `npm run test:postmerge` deploys functions to the project in `GCLOUD_PROJECT` and needs credentials.[^integration-run] In CI it runs only when started by hand.[^postmerge-workflow]

## What reviewers ask for

These come from review, not from a check.

- Test through the public API, such as the exported trigger function and its `__endpoint`, rather than internal helpers.
- Cover the default path and the edge values: an option left unset, `0`, `null`, and an unset environment variable.
- When a key must be absent from the manifest, assert that it is absent. A key present with the value `undefined` is a different result.
- Reset shared state in `afterEach`: call `clearParams` after declaring params, and reset global options when a test sets them.[^params-index] State that outlives a test leaks into the next spec file.

# Rules for agents

- **Must:** run `npm test` for every change, and `npm run test:bin` for changes to what the manifest emits.
- **Must:** reset params and global options that a test sets.
- **Must not:** run `npm run test:postmerge` unless the user asks. It deploys to a real project.
- **Should:** add a test for the default path alongside the new behaviour.
- **Should:** note that `npm run test:bin` runs `npm link`, which changes global npm state.

# Related

- [The manifest contract with firebase-tools](/contracts/manifest-and-discovery.md)
- [Params and Expression](/params/expressions.md)
- [Shared state between CommonJS and ESM copies](/architecture/dual-package-shared-state.md)

[^package-scripts]: The test scripts in `package.json`
[^mocha-setup]: `mocha/setup.ts`
[^test-workflow]: `.github/workflows/test.yaml`
[^postmerge-workflow]: `.github/workflows/postmerge.yaml`
[^bin-run]: `scripts/bin-test/run.sh`
[^bin-test]: `scripts/bin-test/test.ts`
[^integration-run]: `integration_test/run_tests.sh`
[^test-packaging]: `scripts/test-packaging.sh`
[^params-index]: `clearParams` in `src/params/index.ts`
