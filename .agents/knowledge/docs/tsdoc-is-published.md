---
type: Constraint
title: TSDoc is published as the reference docs
description: "Doc comments on exported symbols become the Firebase reference docs through api-extractor and api-documenter, so they are reviewed as published copy, and choices such as repeated option fields and `@hidden` exist for the docs."
tags: [docs, tsdoc, api-extractor, public-api]
agents_md: always
governs:
  - docgen/**
  - src/v1/index.ts
  - src/v2/index.ts
  - src/v2/index.doc.ts
  - src/v2/dataconnect.doc.ts
  - src/v2/options.ts
  - src/v2/providers/*.ts
sources:
  - id: package-scripts
    resource: ../../../package.json
    symbol: '"docgen:v2:extract"'
    title: The docgen scripts
  - id: extractor-v1
    resource: ../../../docgen/api-extractor.v1.json
    symbol: mainEntryPointFilePath
    title: The v1 docs entry point
  - id: extractor-v2
    resource: ../../../docgen/api-extractor.v2.json
    symbol: lib/v2/index.doc.d.ts
    title: The v2 docs entry point
  - id: extractor-base
    resource: ../../../docgen/api-extractor.base.json
    symbol: extractorMessageReporting
    title: Message levels shared by both configs
  - id: docs-workflow
    resource: ../../../.github/workflows/docs.yaml
    symbol: Generate Reference Docs
    title: The Docgen workflow
  - id: v2-index-doc
    resource: ../../../src/v2/index.doc.ts
    symbol: Documentation-only entry point
    title: The documentation-only v2 entry point
  - id: v1-index
    resource: ../../../src/v1/index.ts
    symbol: api-extractor doesn't support that syntax
    title: The comment on how `params` is re-exported
  - id: tsconfig-release
    resource: ../../../tsconfig.release.json
    symbol: '"stripInternal": true'
    title: Drops `@internal` symbols from the declarations
  - id: eslint
    resource: ../../../eslint.config.js
    symbol: jsdoc/require-jsdoc
    title: The lint rule that warns on undocumented public symbols
  - id: pubsub-options
    resource: ../../../src/v2/providers/pubsub.ts
    symbol: export interface PubSubOptions extends options.EventHandlerOptions
    title: A trigger options type that repeats its parent's fields
  - id: pubsub-hidden
    resource: ../../../src/v2/providers/pubsub.ts
    symbol: "@hidden"
    title: "`@hidden` on v1 compatibility members"
---

# Where it lives

- Enforced by: review, plus eslint `jsdoc/require-jsdoc`, which warns (does not fail) on undocumented public symbols. The Docgen workflow runs api-extractor on pushes to `master`; every default message level in the shared config is a warning, and the docgen scripts pass `--local`, so warnings never fail.[^eslint][^docs-workflow][^extractor-base][^package-scripts]
- The docgen scripts, `npm run docgen:v1` and `npm run docgen:v2`, in `package.json`.[^package-scripts]
- The entry points api-extractor reads: `mainEntryPointFilePath` in each config. v2 reads the built `index.doc.ts`, not `index.ts`.[^extractor-v1][^extractor-v2][^v2-index-doc]
- How `params` is re-exported, and why: the comment in `src/v1/index.ts`.[^v1-index]
- Which tags leave the declarations: `stripInternal` in `tsconfig.release.json`.[^tsconfig-release]

# Constraint

Every doc comment on an exported symbol is published as reference documentation, so it is reviewed as user-facing copy: complete sentences, literals and code in backticks.

## Exported types

A public option or return type that refers to a type the entry point doesn't export renders unlinked. api-extractor records `ae-forgotten-export` in the gitignored API report (`docgen/v2/*.api.md`), not the console, so nothing surfaces it but review. Existing code already has many of these.[^extractor-base]

## @internal and @hidden

`@internal` removes a symbol from the published `.d.ts` files, because `tsconfig.release.json` sets `stripInternal`. A public type that refers to an `@internal` symbol then breaks the build's declaration check. `@hidden` leaves the declarations alone; the code uses it on constructors, internal helpers, private fields and v1 compatibility members.[^tsconfig-release][^pubsub-hidden] No tool here acts on `@hidden` (eslint only accepts it as a known tag); whether the published docs hide those symbols isn't recorded in the code.

## Repeated option fields

Trigger option types, such as `PubSubOptions`, repeat fields they inherit from `EventHandlerOptions` and `GlobalOptions`, with their own doc comments.[^pubsub-options]

## Re-export syntax

`src/v1/index.ts` and `src/v2/index.ts` re-export `params` with an import and a named export instead of `export * as`, citing api-extractor.[^v1-index] `index.doc.ts` does use `export * as` for modules outside `index.ts`, and extracts cleanly, so the reason may no longer hold.[^v2-index-doc]

# Why

- Repeated option fields: a maintainer's stated reason, given in review, is that the reference docs don't show the options inherited from a parent type.
- `{@link}`: a maintainer's stated reason, given in review: api-documenter can't resolve some `{@link}` targets, which leaves broken sentences in the generated pages.
- The `export * as` workaround: the comment in `src/v1/index.ts` says api-extractor doesn't support that syntax, yet `index.doc.ts` uses it and extracts cleanly. Ask a maintainer before changing it.[^v1-index]

# Rules for agents

- **Should:** give every new exported symbol a doc comment.
- **Should:** export every type a new public option or return type refers to.
- **Must not:** mark a symbol `@internal` if a public type refers to it.
- **Should:** when adding a field to a shared options type, add it, with its doc comment, to the trigger option types that repeat their parent's fields.
- **Should:** write a code reference in backticks rather than `{@link}` unless you have checked that the generated docs resolve it.
- **Should:** keep the `params` re-export pattern rather than converting it to `export * as`.
- **Ask first:** before adding or changing public API. Maintainers have held such changes for an API review outside this repository.

# Related

- [Add a provider or a package subpath](/playbooks/add-provider-or-subpath.md)
- [Options, resets and merging](/options/resets-and-merging.md)

[^package-scripts]: The docgen scripts in `package.json`
[^extractor-v1]: `docgen/api-extractor.v1.json`
[^extractor-v2]: `docgen/api-extractor.v2.json`
[^extractor-base]: `docgen/api-extractor.base.json`
[^docs-workflow]: `.github/workflows/docs.yaml`
[^v2-index-doc]: `src/v2/index.doc.ts`
[^v1-index]: `src/v1/index.ts`
[^tsconfig-release]: `tsconfig.release.json`
[^eslint]: `jsdoc/require-jsdoc` in `eslint.config.js`
[^pubsub-options]: `PubSubOptions` in `src/v2/providers/pubsub.ts`
[^pubsub-hidden]: `@hidden` in `src/v2/providers/pubsub.ts`
