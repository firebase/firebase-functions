---
type: Constraint
title: Shared state across CJS and ESM copies of the SDK
description: "State that the discovery binary or another copy of the SDK must see (the global manifest, declared params, v2 global options) lives on `globalThis` under `Symbol.for` keys, and `Expression` and `ResetValue` override `Symbol.hasInstance`, because one process can load the SDK more than once."
tags: [architecture, esm, cjs, manifest, params]
agents_md: always
governs:
  - src/runtime/manifest.ts
  - src/runtime/loader.ts
  - src/params/index.ts
  - src/params/types.ts
  - src/common/options.ts
  - src/common/api.ts
  - src/v2/options.ts
  - src/security/roles.ts
  - src/lifecycle/index.ts
sources:
  - id: manifest
    resource: ../../../src/runtime/manifest.ts
    symbol: const GLOBAL_MANIFEST_SYMBOL = Symbol.for("firebase-functions:manifest");
    title: "`globalManifest`, the shared manifest object"
  - id: params-index
    resource: ../../../src/params/index.ts
    symbol: const GLOBAL_PARAMS_SYMBOL
    title: "`declaredParams` and `registerParam`, with the comment on the dual-package hazard"
  - id: loader
    resource: ../../../src/runtime/loader.ts
    symbol: legacySymbols
    title: "`loadStack`, which spreads `globalManifest` and reads params from legacy versioned symbols"
  - id: global-options
    resource: ../../../src/v2/options.ts
    symbol: const GLOBAL_OPTIONS_SYMBOL
    title: "`setGlobalOptions` and `getGlobalOptions`"
  - id: expression
    resource: ../../../src/params/types.ts
    symbol: static [Symbol.hasInstance]
    title: "`Expression`, recognised by a tag rather than by class identity"
  - id: reset-value
    resource: ../../../src/common/options.ts
    symbol: static [Symbol.hasInstance]
    title: "`ResetValue`, recognised by a tag rather than by class identity"
  - id: roles
    resource: ../../../src/security/roles.ts
    symbol: declaredRoles
    title: "`declaredRoles`, stored on `globalManifest` as a wire-ready array"
  - id: lifecycle
    resource: ../../../src/lifecycle/index.ts
    symbol: declaredLifecycleHooks
    title: "`declaredLifecycleHooks`, a Proxy over `globalManifest`"
  - id: app
    resource: ../../../src/common/app.ts
    symbol: export function setApp(
    title: "`setApp`, which stores the admin app in a module-level `cache`"
  - id: loader-spec
    resource: ../../../spec/runtime/loader.spec.ts
    symbol: ingests params declared on legacy versioned symbols into ManifestStack
    title: Tests for legacy symbols and forward-compatible manifest keys
  - id: bin-test
    resource: ../../../scripts/bin-test/test.ts
    symbol: ./scripts/bin-test/sources/esm-params
    title: Discovery tests for CommonJS and ESM sources with params
---

# Where it lives

- Enforced by: the `with params` cases for CommonJS and ESM sources in `scripts/bin-test/test.ts`, and the legacy-symbol tests in `loader.spec.ts`.[^bin-test][^loader-spec]
- The shared manifest: `globalManifest` in `manifest.ts`, spread into the stack by `loadStack` in `loader.ts`.[^manifest][^loader]
- Declared params: `declaredParams` and `registerParam` in `src/params/index.ts`, with a comment that explains the hazard.[^params-index]
- v2 global options: `setGlobalOptions` in `src/v2/options.ts`.[^global-options]
- Type checks across copies: `Expression` in `src/params/types.ts` and `ResetValue` in `src/common/options.ts`.[^expression][^reset-value]
- Deploy-time registries that write into the shared manifest: `declaredRoles` in `roles.ts` and `declaredLifecycleHooks` in `src/lifecycle/index.ts`.[^roles][^lifecycle]

# Constraint

The package ships CommonJS and ESM builds. The discovery binary is CommonJS, and a user's code may load the ESM build, or a second copy of the SDK from a nested `node_modules`. Each copy has its own module-level variables and its own classes.[^params-index]

So state that discovery reads, or that another copy writes, is stored on `globalThis` under a `Symbol.for` key, which every copy resolves to the same symbol. Deploy-time registries (params, required APIs, roles, lifecycle hooks) write into `globalManifest`, and `loadStack` spreads `globalManifest` into the manifest it emits, so a new key reaches the manifest through any loader that spreads `globalManifest`. Older loaders that don't spread it see only params, through the versioned key below.[^manifest][^loader][^roles][^lifecycle]

Params are also mirrored onto a symbol that includes the SDK's major version, so an older loader can find params declared by a newer copy. In the other direction, `loadStack` reads params from every versioned symbol it finds, so params declared by an older copy reach the manifest.[^params-index][^loader]

`instanceof Expression` and `instanceof ResetValue` must hold for instances created by another copy, so both classes override `Symbol.hasInstance` to check a `Symbol.for` tag instead of the prototype chain.[^expression][^reset-value]

# Why

The maintainers' stated reason is in the comment on the global params singleton in `src/params/index.ts`: without it, the CommonJS discovery binary sees an empty list while the user's ESM code fills a different one.[^params-index] The comments on `Symbol.hasInstance` in `Expression` and `ResetValue` give the same reason for type checks.[^expression][^reset-value]

# Rules for agents

- **Must:** store any new state that discovery reads, or that crosses SDK copies, on `globalThis` under a `Symbol.for("firebase-functions:...")` key, or, only for data that belongs in the manifest and that firebase-tools already accepts, as a key of `globalManifest`. Not in a module-level variable. Every `globalManifest` key is emitted at the manifest's top level, where the CLI rejects keys it doesn't know.
- **Must:** give any new class that is checked with `instanceof` across module boundaries a `Symbol.for` tag and a `Symbol.hasInstance` override, as `Expression` does.
- **Must not:** remove or rename the existing symbol keys, including the versioned params key. Older and newer SDK copies loaded together rely on them.
- **Must:** store values on `globalManifest` in their wire form (as `declaredRoles` does with a plain array), so spreading it produces a valid manifest.
- **Should:** add a bin test source for both CommonJS and ESM when adding a new registry.
- Runtime-only state that discovery never reads, such as the `onInit` callback, is module-level; see [onInit](/runtime/on-init.md). The emulated admin app set by `setApp` in `src/common/app.ts` is also module-level, so a call through the CommonJS copy does not reach the ESM copy.[^app]

# Related

- [Manifest and discovery](/contracts/manifest-and-discovery.md)
- [Params and expressions](/params/expressions.md)
- [Options, resets and merging](/options/resets-and-merging.md)

[^manifest]: `globalManifest` in `src/runtime/manifest.ts`
[^params-index]: `src/params/index.ts`
[^loader]: `loadStack` in `src/runtime/loader.ts`
[^global-options]: `src/v2/options.ts`
[^expression]: `Expression` in `src/params/types.ts`
[^reset-value]: `ResetValue` in `src/common/options.ts`
[^roles]: `src/security/roles.ts`
[^lifecycle]: `src/lifecycle/index.ts`
[^app]: `setApp` in `src/common/app.ts`
[^loader-spec]: `spec/runtime/loader.spec.ts`
[^bin-test]: `scripts/bin-test/test.ts`
