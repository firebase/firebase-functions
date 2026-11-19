# AGENTS.md

Notes for AI coding agents working on the Firebase Functions Node.js SDK. This file routes: the code and its docs are the source of truth, and `.agents/knowledge/` holds what they don't say (see [Knowledge base](#knowledge-base)). User docs: `README.md`. Contribution rules: `.github/CONTRIBUTING.md`.

`.guides/` is not for you. It is published to npm with the package as guidance for agents working in users' projects, so edit it only as public documentation. [More](.agents/knowledge/playbooks/add-provider-or-subpath.md)

## Setup

- `npm ci` installs everything. CI tests on Node.js 22 and 24.
- Install tools only when the user asks. Never set up, create or print credentials.

## Verify your change

Run from the repository root.

| Check          | Command                                                                                            |
| -------------- | -------------------------------------------------------------------------------------------------- |
| Lint           | `npm run lint`. `npm run format` fixes what it can. CI runs lint on pull requests only.            |
| Unit tests     | `npm test`. One file: `npx mocha --file ./mocha/setup.ts spec/<path>.spec.ts`.                     |
| Build          | `npm run build`.                                                                                   |
| Discovery      | `npm run test:bin`, when you touch the manifest, `src/bin` or a provider. It runs `npm link`.      |
| Packaging      | `npm run test:packaging`, when you touch `package.json` `exports`, the build or a new entry point. |
| Knowledge base | `./scripts/knowledge.sh check`.                                                                    |

- Don't run `npm run test:postmerge` unless the user asks. It deploys to a real Firebase project. [More](.agents/knowledge/playbooks/test-tiers.md)

## Rules

Each rule links to the concept that explains it.

- **The manifest is a contract with firebase-tools.** An installed CLI rejects most manifest keys it doesn't know, so a new key, trigger type or `specVersion` ships in firebase-tools first. An `eventType` the CLI doesn't know deploys without the CLI's service setup (region check, IAM bindings) and without an error. Never rename the discovery routes or environment variables. [More](.agents/knowledge/contracts/manifest-and-discovery.md)
- **Some fixes belong in firebase-tools.** Defaults the CLI also owns, event-type registration and param resolution live there. Ask before changing them only in the SDK. [More](.agents/knowledge/contracts/manifest-and-discovery.md)
- **Params.** Never call `.value()` on a param while a function is being defined; pass the `Expression` through, or read it inside the handler. [More](.agents/knowledge/params/expressions.md)
- **Shared code goes in `src/common`.** v1 is not frozen: a fix to shared behaviour belongs in `src/common` so both generations get it. [More](.agents/knowledge/architecture/v1-v2-and-common.md)
- **Options.** Follow the existing provider's merge of global and per-function options, and keep `RESET_VALUE` semantics. [More](.agents/knowledge/options/resets-and-merging.md)
- **New provider or subpath.** Several files change together. [Playbook](.agents/knowledge/playbooks/add-provider-or-subpath.md)
- **Shared state.** State that discovery reads, or that crosses copies of the SDK, lives on `globalThis` under `Symbol.for` keys, not in module-level variables. [More](.agents/knowledge/architecture/dual-package-shared-state.md)
- **TSDoc is published.** Doc comments on exported symbols become the reference docs, so document every new exported symbol and export the types its options refer to. [More](.agents/knowledge/docs/tsdoc-is-published.md)
- **Emulator and debug switches** relax auth checks. Test both directions when you touch them. [More](.agents/knowledge/emulator/debug-switches.md)
- **Wrap new handlers in `withInit`**, so `onInit` runs before them. [More](.agents/knowledge/runtime/on-init.md)
- **Tests** go through the public API, cover the default path and edge values, and reset global state. [Playbook](.agents/knowledge/playbooks/test-tiers.md)
- **Release notes.** There is no CHANGELOG. Every PR description needs one `relnote:` line, or `relnote: none`. Never change the `version` in `package.json`, and never publish or tag a release unless the user asks. [More](.agents/knowledge/release/relnotes-and-publishing.md)
- **Breaking changes** to the public API wait for a major version. Ask first. [More](.agents/knowledge/architecture/v1-v2-and-common.md)
- **TypeScript style.** No `any`, and no casts to make types fit; a needed cast usually means the types are wrong. Lint must pass.

## Generated files: don't edit by hand

- `protos/compiledFirestore.*`: run `protos/update.sh`.
- `.agents/knowledge/index.md`: run `./scripts/knowledge.sh index`.

## Knowledge base

`.agents/knowledge/` is an [Open Knowledge Format](https://github.com/GoogleCloudPlatform/open-knowledge-format) bundle. It holds only what the code and docs don't say: why a decision was made, the contracts with firebase-tools, and repository constraints. Each concept starts with "Where it lives", pointing at the code that holds the facts. `index.md` lists every concept.

- **Before you edit or add a file**, run `./scripts/knowledge.sh for <path>...`. It lists the concepts that govern those paths and the code each one points to. A path can be a file that doesn't exist yet, or a directory.
- **Keep it true.** If your change makes a concept wrong, update it in the same PR. The `update-knowledge-base` skill in `.agents/skills/` says how.
- CI runs `./scripts/knowledge.sh check`. It fails when a concept points at a file or symbol that no longer exists, so a change that breaks a concept shows up as a failing check.
