---
type: Constraint
title: Emulator environment and debug switches that relax auth
description: "The Functions emulator sets `FIREBASE_DEBUG_MODE` and `FIREBASE_DEBUG_FEATURES` to skip token verification and force CORS, and `FUNCTIONS_EMULATOR` to skip task queue auth; it calls exported functions directly by their dotted entry point and sets the emulated admin app through `app.setEmulatedAdminApp`, so these switches, that export and the export shape are a contract with firebase-tools."
tags: [emulator, security, https, firebase-tools]
agents_md: when-touching
governs:
  - src/common/debug.ts
  - src/common/providers/https.ts
  - src/common/providers/identity.ts
  - src/common/providers/tasks.ts
  - src/v1/providers/https.ts
  - src/v2/providers/https.ts
  - src/v1/providers/database.ts
  - src/v2/providers/database.ts
sources:
  - id: debug
    resource: ../../../src/common/debug.ts
    symbol: export function isDebugFeatureEnabled
    title: "`isDebugFeatureEnabled` and the `DebugFeatures` it reads"
  - id: common-https
    resource: ../../../src/common/providers/https.ts
    symbol: isDebugFeatureEnabled("skipTokenVerification")
    title: Callable auth and App Check checks, and CORS for requests
  - id: identity
    resource: ../../../src/common/providers/identity.ts
    symbol: isDebugFeatureEnabled("skipTokenVerification")
    title: Blocking function token checks
  - id: tasks
    resource: ../../../src/common/providers/tasks.ts
    symbol: process.env.FUNCTIONS_EMULATOR
    title: Task queue auth, skipped under the emulator
  - id: v2-https
    resource: ../../../src/v2/providers/https.ts
    symbol: isDebugFeatureEnabled("enableCors")
    title: v2 request CORS handling
  - id: v1-https
    resource: ../../../src/v1/providers/https.ts
    symbol: isDebugFeatureEnabled("enableCors")
    title: v1 request CORS handling
  - id: app
    resource: ../../../src/common/app.ts
    symbol: app.setEmulatedAdminApp
    title: "`setApp`, exported as `app.setEmulatedAdminApp` for the emulator"
  - id: v1-database
    resource: ../../../src/v1/providers/database.ts
    symbol: FIREBASE_DATABASE_EMULATOR_HOST
    title: v1 database instance URL under the emulator
  - id: v2-database
    resource: ../../../src/v2/providers/database.ts
    symbol: FIREBASE_DATABASE_EMULATOR_HOST
    title: v2 database instance URL under the emulator
  - id: loader
    resource: ../../../src/runtime/loader.ts
    symbol: entryPoint
    title: How export names become an endpoint's `entryPoint`
  - id: https-spec
    resource: ../../../spec/v2/providers/https.spec.ts
    symbol: isDebugFeatureEnabled
    title: Tests that stub the debug switches
  - id: tasks-spec
    resource: ../../../spec/common/providers/tasks.spec.ts
    symbol: FUNCTIONS_EMULATOR
    title: Task queue tests with and without the emulator
  - id: tools-emulator-envs
    resource: https://github.com/firebase/firebase-tools/blob/main/src/emulator/functionsEmulator.ts
    symbol: getEmulatorEnvs
    title: The environment the emulator sets for the runtime
  - id: tools-signature
    resource: https://github.com/firebase/firebase-tools/blob/main/src/emulator/functionsEmulatorShared.ts
    symbol: getSignatureType
    title: How the emulator picks a function's call signature
  - id: tools-runtime
    resource: https://github.com/firebase/firebase-tools/blob/main/src/emulator/functionsEmulatorRuntime.ts
    symbol: FUNCTION_TARGET_NAME
    title: How the emulator finds and calls an exported function
---

# Where it lives

- Enforced by: unit tests that stub `isDebugFeatureEnabled` or set `FUNCTIONS_EMULATOR`; review for the firebase-tools side.[^https-spec][^tasks-spec]
- Reading the switches: `isDebugFeatureEnabled` in `debug.ts`.[^debug]
- Where they relax checks: `isDebugFeatureEnabled` in `src/common/providers/https.ts`, `identity.ts`, `src/v1/providers/https.ts` and `src/v2/providers/https.ts`; `FUNCTIONS_EMULATOR` in `tasks.ts`.[^common-https][^identity][^v1-https][^v2-https][^tasks]
- Database URLs under the emulator: `FIREBASE_DATABASE_EMULATOR_HOST` in both database providers.[^v1-database][^v2-database]
- How an export name becomes the `entryPoint` the emulator walks: `extractStack` in `loader.ts`.[^loader]

# Constraint

The emulator starts the runtime with `FUNCTIONS_EMULATOR`, `FIREBASE_DEBUG_MODE` and a `FIREBASE_DEBUG_FEATURES` JSON object that turns on `skipTokenVerification` and `enableCors`, plus the emulator host variables (`getEmulatorEnvs` in firebase-tools `functionsEmulator.ts`).[^tools-emulator-envs]

In the SDK:

- `skipTokenVerification` makes callable, App Check and blocking function checks decode tokens without verifying them. For 1st gen callables it also trusts an auth context supplied in the `x-callable-context-auth` header.[^common-https][^identity]
- `enableCors` turns CORS on for request and callable handlers and widens any configured origin to all origins, unless the origin resolves to `false`.[^common-https][^v1-https][^v2-https]
- `FUNCTIONS_EMULATOR` skips the task queue `Authorization` header check.[^tasks]
- A debug feature is on only when `FIREBASE_DEBUG_MODE` is `"true"`; `debug.ts` reads that variable once, when the module loads.[^debug]

The emulator does not serve functions through Cloud Run. It walks the user's module exports by the dotted `FUNCTION_TARGET` (the endpoint's `entryPoint`) and calls the export directly: `(req, res)` for HTTPS triggers, blocking functions and 2nd gen schedules, `(data, context)` for 1st gen events, and `(cloudEvent)` for 2nd gen events. It picks the signature from the trigger type and the endpoint's `platform` (`getSignatureType` and `FUNCTION_TARGET_NAME` in firebase-tools).[^tools-signature][^tools-runtime] The SDK builds `entryPoint` by replacing each `-` in the joined export path with `.`.[^loader]

# Why

The likely reason (not recorded): local testing needs auth and CORS without real tokens or browser preflight setup, and the emulator calls functions in-process. The switches are off unless the emulator, or someone, sets the environment explicitly.

# Rules for agents

- **Must:** test both directions when you touch a debug switch or `FUNCTIONS_EMULATOR`: that the check is relaxed with the switch on, and that it is enforced with the switch off.
- **Must not:** relax a check on any other signal, or add a new relaxation, without a matching firebase-tools change and a maintainer's agreement.
- **Must not:** rename these environment variables or the `DebugFeatures` keys. firebase-tools sets them by name.
- **Must:** keep exported functions callable with the signatures above, and keep each endpoint's `platform` accurate, or the emulator calls it with the wrong arguments.
- **Must not:** change how `entryPoint` is built without a firebase-tools change. Export names that contain `.` or `-` aren't supported by this mapping (inferred from `extractStack`, not tested).
- **Must not:** remove or rename `app.setEmulatedAdminApp` from the v1 or v2 entry points. The emulator calls it.[^app]
- **Should:** stub `isDebugFeatureEnabled` in tests rather than setting `FIREBASE_DEBUG_MODE`, since `debug.ts` reads that only at load.

# Related

- [Manifest and discovery](/contracts/manifest-and-discovery.md)
- [Test tiers](/playbooks/test-tiers.md)
- [v1, v2 and src/common](/architecture/v1-v2-and-common.md)

[^debug]: `src/common/debug.ts`
[^common-https]: `src/common/providers/https.ts`
[^identity]: `src/common/providers/identity.ts`
[^tasks]: `src/common/providers/tasks.ts`
[^v2-https]: `src/v2/providers/https.ts`
[^v1-https]: `src/v1/providers/https.ts`
[^app]: `setApp` in `src/common/app.ts`
[^v1-database]: `src/v1/providers/database.ts`
[^v2-database]: `src/v2/providers/database.ts`
[^loader]: `src/runtime/loader.ts`
[^https-spec]: `spec/v2/providers/https.spec.ts`
[^tasks-spec]: `spec/common/providers/tasks.spec.ts`
[^tools-emulator-envs]: `getEmulatorEnvs` in firebase-tools
[^tools-signature]: `getSignatureType` in firebase-tools
[^tools-runtime]: The emulator runtime in firebase-tools
