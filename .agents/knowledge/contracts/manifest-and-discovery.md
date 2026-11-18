---
type: Constraint
title: The manifest is a contract with firebase-tools
description: "The SDK reports its functions to firebase-tools as a v1alpha1 manifest through the `firebase-functions` binary, and the CLI rejects most keys, any `specVersion` and many `null` values it doesn't expect, so manifest changes ship in firebase-tools first and the discovery routes and environment variables never change."
tags: [manifest, discovery, firebase-tools, lifecycle, python-parity]
agents_md: always
governs:
  - src/bin/**
  - src/runtime/**
  - src/lifecycle/**
  - spec/runtime/**
  - spec/lifecycle/**
  - scripts/bin-test/**
sources:
  - id: bin-test
    resource: ../../../scripts/bin-test/test.ts
    symbol: const DEFAULT_OPTIONS
    title: Discovery tests over HTTP and file output, for CommonJS and ESM sources
  - id: loader-spec
    resource: ../../../spec/runtime/loader.spec.ts
    symbol: loadStack with lifecycleHooks
    title: Unit tests for `extractStack` and `loadStack`
  - id: bin
    resource: ../../../src/bin/firebase-functions.ts
    symbol: FUNCTIONS_MANIFEST_OUTPUT_PATH
    title: The discovery binary and its two modes
  - id: loader
    resource: ../../../src/runtime/loader.ts
    symbol: export async function loadStack(
    title: "`loadStack` and `extractStack`, which build the manifest from the user's exports"
  - id: manifest
    resource: ../../../src/runtime/manifest.ts
    symbol: export function stackToWire(
    title: "`ManifestStack`, `ManifestEndpoint`, `stackToWire` and `globalManifest`"
  - id: lifecycle
    resource: ../../../src/lifecycle/index.ts
    symbol: export function afterFirstDeploy(
    title: Deploy-time lifecycle hooks
  - id: tools-yaml-to-build
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/runtimes/discovery/index.ts
    symbol: yamlToBuild
    title: The CLI's `specVersion` check and discovery transports
  - id: tools-v1alpha1
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/runtimes/discovery/v1alpha1.ts
    symbol: buildFromV1Alpha1
    title: The CLI's schema for every manifest key
  - id: tools-parsing
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/runtimes/discovery/parsing.ts
    symbol: assertKeyTypes
    title: Rejects unknown keys and `null` on non-optional keys
  - id: tools-node-runtime
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/runtimes/node/index.ts
    symbol: spawnFunctionsProcess
    title: How the CLI runs the SDK binary
  - id: tools-services
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/services/index.ts
    symbol: EVENT_SERVICE_MAPPING
    title: The event types the CLI knows how to set up
  - id: python-manifest
    resource: https://github.com/firebase/firebase-functions-python/blob/main/src/firebase_functions/private/manifest.py
    symbol: ManifestStack
    title: The Python SDK's manifest types
  - id: python-serving
    resource: https://github.com/firebase/firebase-functions-python/blob/main/src/firebase_functions/private/serving.py
    symbol: functions_as_yaml
    title: The Python SDK's discovery server
---

# Where it lives

- Enforced by: `scripts/bin-test/test.ts`, which runs both discovery modes against CommonJS and ESM sources and compares the result with expected manifests built from `DEFAULT_OPTIONS`; and `loader.spec.ts`. No pre-merge check runs the firebase-tools parser: only `npm run test:postmerge` deploys, with the latest CLI, so version skew is never tested.[^bin-test][^loader-spec]
- The discovery binary and its two modes, `FUNCTIONS_MANIFEST_OUTPUT_PATH` and `FUNCTIONS_CONTROL_API`, in `firebase-functions.ts`.[^bin]
- How exports become endpoints, and which top-level keys are always present: `extractStack` and the comment in `loadStack`, in `loader.ts`.[^loader]
- The wire types and the conversion of `Expression` and `ResetValue`: `ManifestStack`, `ManifestEndpoint` and `stackToWire` in `manifest.ts`.[^manifest]
- Stack-level declarations (params, required APIs and roles, lifecycle hooks) collect on `globalManifest` in `manifest.ts`; hooks are registered by `afterFirstDeploy` and `afterRedeploy` in `lifecycle/index.ts`.[^manifest][^lifecycle]

# Constraint

## Version skew

The SDK and the CLI are installed separately, and a user's CLI is often older than their SDK. The CLI checks every manifest it reads. It rejects unknown keys at the top level, on each endpoint, on each trigger and in `vpc`, `retryConfig` and `rateLimits`, with "Unexpected key ... You may need to install a newer version of the Firebase CLI".[^tools-parsing][^tools-v1alpha1] It does not check keys inside `blockingTrigger.options`, `params` entries or lifecycle hooks, so an unknown key there is accepted and has no effect. It accepts exactly one `specVersion`; any other value fails the deploy.[^tools-yaml-to-build]

So a key the SDK starts emitting breaks deploys for every user on an older CLI. If it is emitted for every endpoint, for example as a reset default, every deploy breaks, not only those that use the feature.

## Resets and null

`null` in the manifest means "reset to the platform default". The CLI accepts `null` only where its `assertKeyTypes` schema type ends in `?`, or where the key's validator function accepts `null`; anywhere else it fails the deploy.[^tools-parsing] See [Options, resets and merging](/options/resets-and-merging.md) for where the SDK emits resets.

## Discovery

The CLI first looks for a `functions.yaml` file in the source directory. Without one, it runs the package's `firebase-functions` binary with the source directory as the working directory, and either serves the manifest over HTTP on `PORT` (it fetches `/__/functions.yaml`, then calls `/__/quitquitquit`) or sets `FUNCTIONS_MANIFEST_OUTPUT_PATH` and waits for the process to exit.[^tools-node-runtime][^tools-yaml-to-build] HTTP is the default; the CLI uses file output only when the user sets `FIREBASE_FUNCTIONS_DISCOVERY_OUTPUT_PATH`. The CLI always sets `FUNCTIONS_CONTROL_API=true`, and the binary serves `/__/functions.yaml` only when that variable is `"true"`. The CLI parses the body as YAML; the SDK sends JSON, which YAML accepts.[^bin]

The CLI passes the source directory as a single argument, and the binary reads a directory argument only when there is more than one, so discovery works because of the working directory.[^bin]

A function's id is its export path joined with `-`, and its `entryPoint` is the same path joined with `.`.[^loader]

## Event types

An `eventType` the CLI doesn't list in `EVENT_SERVICE_MAPPING` gets the no-op service, as v1 and custom Eventarc events do: the function still deploys, but the CLI skips that service's region check, IAM bindings and default region, without an error.[^tools-services]

## Lifecycle hooks

`afterFirstDeploy` and `afterRedeploy` record deploy-time actions on `globalManifest.lifecycleHooks`. The record is created only when a hook is registered, so a project without hooks emits no `lifecycleHooks` key.[^lifecycle] The CLI validates hooks in `buildFromV1Alpha1`.[^tools-v1alpha1]

## Fixes that belong in firebase-tools

Parameter resolution, event-type setup, trigger regions and the defaults the CLI fills in live in firebase-tools. A change to the SDK alone can make the two disagree.

# Why

The likely reason (not recorded): strict parsing makes an SDK and CLI mismatch fail at deploy time, instead of silently dropping an option the user set.

# Python SDK

firebase-functions-python emits manifests for the same CLI parser, through `ManifestStack` in `manifest.py` and `functions_as_yaml` in `serving.py`.[^python-manifest][^python-serving] Both SDKs must therefore emit the same `specVersion`, CEL syntax and param `type` strings. The Python SDK has no v1 API, serves discovery over HTTP only, and its `ManifestStack` has no `extensions`, `requiredRoles` or `lifecycleHooks`. Whether each difference is deliberate isn't recorded.

# Rules for agents

- **Must:** land support for a new manifest key, trigger type or `specVersion` in firebase-tools before the SDK emits it, and for a new `eventType` that needs a region check, IAM bindings or a default region.
- **Should:** omit an optional key when the user hasn't set it, so manifests from projects that don't use a feature stay readable by older CLIs.
- **Should:** say in the relnote which firebase-tools version a new manifest feature needs.
- **Must:** emit `null` only on keys the CLI accepts it for: an optional schema type or a validator that allows `null`.
- **Must not:** rename or remove `/__/functions.yaml`, `/__/quitquitquit`, `FUNCTIONS_CONTROL_API`, `FUNCTIONS_MANIFEST_OUTPUT_PATH` or the `PORT` handling in the binary.
- **Must not:** make discovery depend on the directory argument.
- **Must:** update `DEFAULT_OPTIONS` and the expected manifests in `scripts/bin-test/test.ts` when the emitted defaults change, and run `npm run test:bin`.
- **Ask first:** before fixing in the SDK alone something firebase-tools owns: param resolution, event-type setup, trigger regions or CLI defaults.
- **Should:** check the Python SDK when changing anything both SDKs emit.

# Related

- [Options, resets and merging](/options/resets-and-merging.md)
- [Params and Expression](/params/expressions.md)
- [Emulator and debug switches](/emulator/debug-switches.md)
- [Adding a provider or subpath](/playbooks/add-provider-or-subpath.md)
- [Release notes and publishing](/release/relnotes-and-publishing.md)
- [Shared state between CommonJS and ESM copies](/architecture/dual-package-shared-state.md)

[^bin-test]: `scripts/bin-test/test.ts`
[^loader-spec]: `spec/runtime/loader.spec.ts`
[^bin]: The `firebase-functions` binary
[^loader]: `loadStack` and `extractStack`
[^manifest]: `manifest.ts`
[^lifecycle]: `lifecycle/index.ts`
[^tools-yaml-to-build]: firebase-tools `yamlToBuild` and the discovery transports
[^tools-v1alpha1]: firebase-tools `buildFromV1Alpha1`
[^tools-parsing]: firebase-tools `assertKeyTypes`
[^tools-node-runtime]: firebase-tools `spawnFunctionsProcess`
[^tools-services]: firebase-tools `EVENT_SERVICE_MAPPING` and `serviceForEndpoint`
[^python-manifest]: Python `ManifestStack`
[^python-serving]: Python `functions_as_yaml`
