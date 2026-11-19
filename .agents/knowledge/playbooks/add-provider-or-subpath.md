---
type: Playbook
title: Add a provider or a package subpath
description: "A new import path such as `firebase-functions/<name>` changes `package.json` `exports` and `typesVersions` and an entry point, and the packaging tests check the result in CommonJS and ESM."
tags: [packaging, exports, build, providers]
agents_md: when-touching
governs:
  - package.json
  - tsdown.config.mts
  - tsconfig.release.json
  - tsconfig.dts.json
  - scripts/verify-exports.mjs
  - scripts/verify-types.mjs
  - scripts/test-packaging.sh
  - src/v1/providers/*.ts
  - src/v2/providers/*.ts
  - src/v2/index.ts
  - src/v2/index.doc.ts
  - src/v2/dataconnect.doc.ts
  - src/v2/providers/dataconnect/**
  - v1/**
  - v2/**
  - logger/**
  - lifecycle/**
  - .guides/**
sources:
  - id: package-json
    resource: ../../../package.json
    symbol: '"typesVersions"'
    title: The `exports`, `typesVersions` and `files` fields
  - id: verify-types
    resource: ../../../scripts/verify-types.mjs
    symbol: must list "types" as its first condition
    title: Checks `exports` against `typesVersions` and type-checks every entry point
  - id: verify-exports
    resource: ../../../scripts/verify-exports.mjs
    symbol: optional peer dependencies
    title: Loads every export with `require` and `import`
  - id: test-packaging
    resource: ../../../scripts/test-packaging.sh
    symbol: --only-optional-peers
    title: Packs the SDK, installs it in a scratch project and runs both verify scripts
  - id: root-shim
    resource: ../../../v2/firestore.js
    symbol: This file is not part of the firebase-functions SDK
    title: A root shim and the comment that explains it
  - id: v2-index
    resource: ../../../src/v2/index.ts
    symbol: import * as firestore from "./providers/firestore";
    title: The v2 entry point, which re-exports each provider
  - id: v2-index-doc
    resource: ../../../src/v2/index.doc.ts
    symbol: Documentation-only entry point
    title: The documentation-only entry point and why it exists
  - id: tsdown
    resource: ../../../tsdown.config.mts
    symbol: rewriteProtoPathMjs
    title: The CommonJS and ESM builds, and why tsc writes the declarations
  - id: tsconfig-release
    resource: ../../../tsconfig.release.json
    symbol: '"stripInternal": true'
    title: Declaration output, which drops `@internal` symbols
  - id: tsconfig-dts
    resource: ../../../tsconfig.dts.json
    symbol: without dangling imports
    title: Type-checks the emitted declarations against each other
---

# Where it lives

- Enforced by: `test-packaging.sh` (the CI `packaging` job), which runs `verify-exports.mjs` and `verify-types.mjs` against the packed tarball.[^test-packaging]
- The `exports` and `typesVersions` parity check, and the rule that `types` comes first in each export target: `verify-types.mjs`.[^verify-types]
- The subpaths that need optional peer dependencies and are skipped when loading: `verify-exports.mjs`.[^verify-exports]
- Why the root `v1/`, `v2/`, `logger/` and `lifecycle/` folders hold comment-only `.js` shims: the comment in `v2/firestore.js`, which names an eslint import plugin this repository no longer configures.[^root-shim]
- Entry points: `index.ts` for the package root and `index.doc.ts` for the reference docs.[^v2-index][^v2-index-doc]
- The build: two tsdown passes in `tsdown.config.mts`, then tsc declarations with `stripInternal`, then a type-check of the emitted declarations.[^tsdown][^tsconfig-release][^tsconfig-dts]

# When to use

When you add a provider file, a new import path such as `firebase-functions/<name>`, or move a module that an import path points at. Editing an existing provider whose import path already exists needs none of this.

# Steps

1. **`package.json`.** Add an `exports` entry for each import path. A v2 provider usually gets both `./<name>` and `./v2/<name>`. Each target lists `types` first, then `import` (the ESM build under `lib/esm/`) and `require`. Add the matching `typesVersions` entries. Copy an existing provider's entries rather than writing them from memory.[^package-json][^verify-types]
2. **Entry point.** Re-export the provider from `src/v2/index.ts`. A module that must not load for every user, because it needs an optional peer dependency, stays out of `index.ts` and is re-exported from `index.doc.ts` instead, so it still gets reference docs.[^v2-index][^v2-index-doc]
3. **TSDoc.** Document every exported symbol and export every type a public option refers to. See [TSDoc is published](/docs/tsdoc-is-published.md).
4. **Verify.** Run `npm run test:packaging`; it builds first. It packs, installs the tarball in a scratch project and loads every entry point in CommonJS and ESM, type-checks the core entry points without the optional peers, then installs `graphql` and type-checks the entry points that need it.[^test-packaging]

A new subpath doesn't need a root shim: recent subpaths such as `v2/ai` have none.[^root-shim]

## Build

- tsdown writes CommonJS to `lib/` and ESM to `lib/esm/`, one file per source file. tsc writes the `.d.ts` files, because tsdown's declaration plugin has problems (see the comment in `tsdown.config.mts`).[^tsdown]
- The ESM build rewrites the import path of the compiled Firestore protos. A new import of `protos/` needs the same treatment.[^tsdown]
- `tsconfig.release.json` sets `stripInternal`, and `tsconfig.dts.json` then type-checks `lib/**/*.d.ts`. A public type that refers to an `@internal` symbol fails the build.[^tsconfig-release][^tsconfig-dts]

## Optional peer dependencies

The Data Connect GraphQL server needs optional peers. `src/v2/providers/dataconnect/index.ts` must not import `graphql.ts`, or every user of `firebase-functions/dataconnect` would need those peers installed.[^verify-exports][^test-packaging]

## .guides

`.guides/` is in the `files` list in `package.json`, so it ships to npm users.[^package-json] It is guidance for agents working in users' projects, not for agents working on this repository. Edit it as public documentation. The likely reason (not recorded): tools that read installed packages pick it up.

# Rules for agents

- **Must:** keep `exports` and `typesVersions` in step, with `types` first in each export target.
- **Must:** run `npm run test:packaging` after changing `package.json` exports, the build config or an entry point.
- **Must not:** import an optional peer dependency from a module that a non-optional entry point loads.
- **Must not:** edit `.guides/` as if it were contributor documentation.
- **Ask first:** before adding a new top-level import path. It widens the public API.

# Related

- [TSDoc is published](/docs/tsdoc-is-published.md)
- [Test tiers](/playbooks/test-tiers.md)
- [Shared state between CommonJS and ESM copies](/architecture/dual-package-shared-state.md)
- [The manifest contract with firebase-tools](/contracts/manifest-and-discovery.md)

[^package-json]: `package.json`
[^verify-types]: `scripts/verify-types.mjs`
[^verify-exports]: `scripts/verify-exports.mjs`
[^test-packaging]: `scripts/test-packaging.sh`
[^root-shim]: `v2/firestore.js`
[^v2-index]: `src/v2/index.ts`
[^v2-index-doc]: `src/v2/index.doc.ts`
[^tsdown]: `tsdown.config.mts`
[^tsconfig-release]: `tsconfig.release.json`
[^tsconfig-dts]: `tsconfig.dts.json`
