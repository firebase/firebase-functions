---
type: Constraint
title: Release notes come from relnote lines; versions from npm
description: "There is no CHANGELOG: every PR description carries a `relnote:` line that `scripts/changelog.sh` collects at release, and `package.json` stays at `0.0.0-development` because `scripts/publish.sh` computes the version from npm."
tags: [release, relnote, versioning, ci]
agents_md: always
governs:
  - .github/workflows/lint-relnotes.yaml
  - scripts/changelog.sh
  - scripts/publish.sh
  - scripts/publish/**
  - package.json
  - tsdown.config.mts
sources:
  - id: lint-relnotes
    resource: ../../../.github/workflows/lint-relnotes.yaml
    symbol: "name: Validate PR Release Notes"
    title: Fails a pull request whose description has no non-empty relnote line
  - id: changelog
    resource: ../../../scripts/changelog.sh
    symbol: process_note() {
    title: Collects release notes from commit bodies since the last release tag
  - id: publish
    resource: ../../../scripts/publish.sh
    symbol: No release notes (relnote comments) found
    title: Computes the version from npm, builds, and publishes
  - id: package-version
    resource: ../../../package.json
    symbol: '"version": "0.0.0-development"'
    title: The placeholder version on the default branch
  - id: tsdown-version
    resource: ../../../tsdown.config.mts
    symbol: const majorVersion = pkg.version
    title: The build reads the package version
  - id: tools-versioning
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/runtimes/node/versioning.ts
    symbol: FUNCTIONS_SDK_DEV_VERSION
    title: The CLI treats the placeholder version as a development build
---

# Where it lives

- Enforced by: the `lint-relnotes.yaml` workflow on every pull request, and the check in `publish.sh` that aborts a release with no notes.[^lint-relnotes][^publish]
- How notes are collected, joined and filtered: `process_note()` and the loops around it in `changelog.sh`.[^changelog]
- How the release version is computed, and the order of build, version bump and publish: `publish.sh`.[^publish]
- The placeholder version: `version` in `package.json`.[^package-version]
- A build-time read of that version: `majorVersion` in `tsdown.config.mts`.[^tsdown-version]

# Constraint

## Release notes

There is no CHANGELOG file. Each pull request description needs a line that starts with `relnote:` (or `relnotes:`), and the first such line must not be empty. Write `relnote: none` when nothing user-visible changed.[^lint-relnotes] Write it in lower case: CI accepts any case, but `changelog.sh` collects only lines starting `relnote:` or `Relnote:`.

At release, `changelog.sh` reads the **commit bodies** between the last `vX.Y.Z` tag and `HEAD`, not the pull request descriptions. A note reaches the release only if it is in the merged commit's body.[^changelog] In that body:

- Each `relnote:` line starts a new entry, so several lines make several entries.
- The lines after a `relnote:` line are joined onto it until a blank line or a line starting with `#`.
- A note of `none` is dropped.
- The pull request number from the commit subject is appended, unless the note already ends with one.
- Commits reverted within the range are dropped, with their notes.

## Versions

`package.json` keeps the placeholder `0.0.0-development` on the default branch.[^package-version] `publish.sh` runs in Cloud Build: it reads the latest published versions from npm, applies the requested bump with `npm version`, and publishes. It runs in dry-run mode unless told otherwise.[^publish] firebase-tools treats the placeholder as a development build and skips its minimum SDK version check.[^tools-versioning]

`publish.sh` builds before it bumps the version, and nothing rebuilds afterwards.[^publish] So anything the build reads from `package.json`, such as `majorVersion` in `tsdown.config.mts`, sees `0.0.0-development` in the published package too.[^tsdown-version]

# Why

The maintainers' stated reason: the release pipeline is stateless, so a release never commits to the default branch. Notes come from commit history and the version from npm, instead of from files a release would have to edit, which improves security.

# Rules for agents

- **Must:** put a `relnote:` line in every pull request description you write, or `relnote: none`. Follow it with a blank line, or the next lines become part of the note.
- **Should:** write one `relnote:` line per user-visible change, not one per commit.
- **Must not:** add a CHANGELOG file.
- **Must not:** change `version` in `package.json`.
- **Must not:** depend on the `package.json` version at build time. It is the placeholder in every build, including published ones.
- **Must not:** run `publish.sh`, push tags or create releases unless the user asks.

# Related

- [The manifest is a contract with firebase-tools](/contracts/manifest-and-discovery.md)
- [Shared state between CommonJS and ESM copies](/architecture/dual-package-shared-state.md)

[^lint-relnotes]: `lint-relnotes.yaml`
[^changelog]: `scripts/changelog.sh`
[^publish]: `scripts/publish.sh`
[^package-version]: `package.json`
[^tsdown-version]: `tsdown.config.mts`
[^tools-versioning]: firebase-tools `FUNCTIONS_SDK_DEV_VERSION`
