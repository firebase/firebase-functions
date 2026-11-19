---
type: Decision
title: v1 and v2 share src/common, and v1 is still maintained
description: "The root import is the v2 API, v1 lives under `firebase-functions/v1` and still gets fixes and shared features, behaviour both generations use lives in `src/common`, and v2 events expose v1-shaped getters through `addV1Compat`."
tags: [architecture, v1, v2, api-surface]
agents_md: always
governs:
  - src/v1/**
  - src/v2/index.ts
  - src/v2/compat.ts
  - src/common/**
sources:
  - id: package-json
    resource: ../../../package.json
    symbol: '"main": "lib/v2/index.js"'
    title: The root entry point and `exports` map
  - id: v1-index
    resource: ../../../src/v1/index.ts
    symbol: export const app = { setEmulatedAdminApp };
    title: The v1 entry point
  - id: v2-index
    resource: ../../../src/v2/index.ts
    symbol: export { config } from "../v1/config";
    title: The v2 entry point, which re-exports the removed `config` until the next major version
  - id: v1-config
    resource: ../../../src/v1/config.ts
    symbol: "export const config: never"
    title: "`functions.config()`, which throws"
  - id: common-providers
    resource: ../../../src/common/providers
    title: Provider logic shared by v1 and v2
  - id: compat
    resource: ../../../src/v2/compat.ts
    symbol: export function addV1Compat
    title: "`addV1Compat` and the generic `V1Compat` type"
  - id: compat-spec
    resource: ../../../spec/v2/compat.spec.ts
    symbol: addV1Compat
    title: Tests for the v1 compatibility getters
  - id: v1-function-builder
    resource: ../../../src/v1/function-builder.ts
    symbol: Expression
    title: v1 runtime options, which accept params
---

# Where it lives

- Enforced by: `compat.spec.ts` for the compatibility getters; otherwise review only.[^compat-spec]
- The root import resolves to v2: `main` and the `"."` entry in `package.json`; v1 is the `./v1` entry.[^package-json]
- Shared provider logic used by both generations: the files in `src/common/providers`.[^common-providers]
- v1-shaped getters on v2 events: `addV1Compat` and `V1Compat` in `compat.ts`.[^compat]
- The removed `functions.config()`: `config` in `src/v1/config.ts`, still re-exported from `src/v2/index.ts`.[^v1-config][^v2-index]

# Decision

`firebase-functions` imports the 2nd gen (v2) API. The 1st gen API is a separate entry point, `firebase-functions/v1`.[^package-json][^v1-index]

v1 is not frozen. It still receives fixes and features that apply to both generations, such as params in runtime options.[^v1-function-builder] Behaviour that both generations need (callable and request handling, identity blocking functions, task queues, database and Firestore helpers) lives once in `src/common`, and both `src/v1/providers` and `src/v2/providers` call into it.[^common-providers]

v2 event handlers can read v1-style properties (such as `context` and the v1 data name) through getters that `addV1Compat` attaches. It marks an event so it is patched once, and memoizes each getter.[^compat]

`functions.config()` was removed. `config` is typed `never` and throws with a migration message.[^v1-config] `src/v2/index.ts` still re-exports it. The comment there says the Functions emulator monkey patches it, but the emulator on the firebase-tools default branch no longer does, and a TODO marks the export for removal in the next major release.[^v2-index]

# Why

The likely reason (not recorded): sharing provider logic in `src/common` keeps the two generations' behaviour identical on the wire and in tests, so a bug is fixed once. The reason for keeping `config` exported is stated in the comment above that export in `src/v2/index.ts`: the emulator patches it. That reason no longer holds for the firebase-tools emulator, which doesn't patch `config`; the export waits for a major release because removing it is breaking.[^v2-index]

# Rules for agents

- **Must:** put a fix to shared behaviour in `src/common` when both generations use it, not in only one of `src/v1/providers` or `src/v2/providers`.
- **Must not:** treat `src/v1` as frozen or out of scope. A fix that applies to both generations should reach both.
- **Must:** make v1 compatibility getters on v2 events match the v1 shape for the same event as closely as the v2 event allows, and say which fields the v2 event can't supply.
- **Should:** use the generic `V1Compat` type and `addV1Compat`, not a new per-provider type or patching scheme. The exception is an event that is not a `CloudEvent`, such as a scheduler event, which defines its getter directly.
- **Must not:** restore `functions.config()` or make it return a value. It stays a throwing stub until it is removed.
- **Ask first:** before any breaking change to the public API (removing or renaming an export, changing a type incompatibly, changing a default). Breaking changes wait for a major release.

# Related

- [Adding a provider or subpath](/playbooks/add-provider-or-subpath.md)
- [Shared state across CJS and ESM copies](/architecture/dual-package-shared-state.md)
- [Manifest and discovery](/contracts/manifest-and-discovery.md)

[^package-json]: `package.json`
[^v1-index]: `src/v1/index.ts`
[^v2-index]: `src/v2/index.ts`
[^v1-config]: `src/v1/config.ts`
[^common-providers]: `src/common/providers`
[^compat]: `src/v2/compat.ts`
[^compat-spec]: `spec/v2/compat.spec.ts`
[^v1-function-builder]: `src/v1/function-builder.ts`
