---
okf_version: "0.2"
---

# Architecture

* [Shared state across CJS and ESM copies of the SDK](architecture/dual-package-shared-state.md) - State that the discovery binary or another copy of the SDK must see (the global manifest, declared params, v2 global options) lives on `globalThis` under `Symbol.for` keys, and `Expression` and `ResetValue` override `Symbol.hasInstance`, because one process can load the SDK more than once.
* [v1 and v2 share src/common, and v1 is still maintained](architecture/v1-v2-and-common.md) - The root import is the v2 API, v1 lives under `firebase-functions/v1` and still gets fixes and shared features, behaviour both generations use lives in `src/common`, and v2 events expose v1-shaped getters through `addV1Compat`.

# Contracts

* [The manifest is a contract with firebase-tools](contracts/manifest-and-discovery.md) - The SDK reports its functions to firebase-tools as a v1alpha1 manifest through the `firebase-functions` binary, and the CLI rejects most keys, any `specVersion` and many `null` values it doesn't expect, so manifest changes ship in firebase-tools first and the discovery routes and environment variables never change.

# Docs

* [TSDoc is published as the reference docs](docs/tsdoc-is-published.md) - Doc comments on exported symbols become the Firebase reference docs through api-extractor and api-documenter, so they are reviewed as published copy, and choices such as repeated option fields and `@hidden` exist for the docs.

# Emulator

* [Emulator environment and debug switches that relax auth](emulator/debug-switches.md) - The Functions emulator sets `FIREBASE_DEBUG_MODE` and `FIREBASE_DEBUG_FEATURES` to skip token verification and force CORS, and `FUNCTIONS_EMULATOR` to skip task queue auth; it calls exported functions directly by their dotted entry point and sets the emulated admin app through `app.setEmulatedAdminApp`, so these switches, that export and the export shape are a contract with firebase-tools.

# Options

* [Options reset to platform defaults and merge per provider](options/resets-and-merging.md) - Every resettable endpoint option is emitted as `RESET_VALUE` (`null` on the wire) unless `preserveExternalChanges` is set, and each v2 provider merges global options, then its own options, by hand, validating `timeoutSeconds` for its trigger kind.

# Params

* [Params stay Expressions until the handler runs](params/expressions.md) - Param values are resolved by firebase-tools after discovery, so SDK code passes an `Expression` into the manifest as CEL and calls `.value()` only inside a handler; the CEL forms, param types and list encoding are a contract with the CLI.

# Playbooks

* [Add a provider or a package subpath](playbooks/add-provider-or-subpath.md) - A new import path such as `firebase-functions/<name>` changes `package.json` `exports` and `typesVersions` and an entry point, and the packaging tests check the result in CommonJS and ESM.
* [Test tiers and what reviewers expect from tests](playbooks/test-tiers.md) - Unit specs run offline under mocha, the discovery tests run the built SDK through the `firebase-functions` binary, the packaging tests install the packed tarball, and the post-merge suite deploys to a real project and runs only by hand.

# Release

* [Release notes come from relnote lines; versions from npm](release/relnotes-and-publishing.md) - There is no CHANGELOG: every PR description carries a `relnote:` line that `scripts/changelog.sh` collects at release, and `package.json` stays at `0.0.0-development` because `scripts/publish.sh` computes the version from npm.

# Runtime

* [Every handler runs the onInit callback first](runtime/on-init.md) - `onInit` registers a callback that `withInit` runs before the first invocation of any function, so every provider must wrap its handler in `withInit`; the callback never runs during discovery.
