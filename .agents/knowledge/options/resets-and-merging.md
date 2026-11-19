---
type: Decision
title: Options reset to platform defaults and merge per provider
description: "Every resettable endpoint option is emitted as `RESET_VALUE` (`null` on the wire) unless `preserveExternalChanges` is set, and each v2 provider merges global options, then its own options, by hand, validating `timeoutSeconds` for its trigger kind."
tags: [options, manifest, v2]
agents_md: when-touching
governs:
  - src/common/options.ts
  - src/v2/options.ts
  - spec/v2/options.spec.ts
  - scripts/bin-test/test.ts
sources:
  - id: reset-value
    resource: ../../../src/common/options.ts
    symbol: export class ResetValue
    title: "`ResetValue` and `RESET_VALUE`, which serialize to `null`"
  - id: resettable-options
    resource: ../../../src/runtime/manifest.ts
    symbol: "const RESETTABLE_OPTIONS: ResettableKeys<ManifestEndpoint>"
    title: The endpoint keys reset on every deploy
  - id: init-endpoint
    resource: ../../../src/runtime/manifest.ts
    symbol: function initEndpoint(
    title: "`initEndpoint`, `initV1Endpoint` and `initV2Endpoint`, which apply the resets unless `preserveExternalChanges` is set"
  - id: stack-to-wire
    resource: ../../../src/runtime/manifest.ts
    symbol: export function stackToWire(
    title: "`stackToWire`, which turns resets into `null` under `endpoints`"
  - id: preserve-external-changes
    resource: ../../../src/v2/options.ts
    symbol: "preserveExternalChanges?: boolean;"
    title: The `preserveExternalChanges` option and its TSDoc
  - id: set-global-options
    resource: ../../../src/v2/options.ts
    symbol: Calling setGlobalOptions twice leads to undefined behavior
    title: "`setGlobalOptions`, which warns on a second call"
  - id: options-to-endpoint
    resource: ../../../src/v2/options.ts
    symbol: export function optionsToEndpoint(
    title: "`optionsToEndpoint`, which converts options to endpoint fields"
  - id: assert-timeout
    resource: ../../../src/v2/options.ts
    symbol: export function assertTimeoutSecondsValid(
    title: "`assertTimeoutSecondsValid` and `TimeoutKind`, the per-kind timeout limits"
  - id: pubsub-merge
    resource: ../../../src/v2/providers/pubsub.ts
    symbol: "retry: opts.retry ?? false,"
    title: The merge pattern in `onMessagePublished`
  - id: bin-test-defaults
    resource: ../../../scripts/bin-test/test.ts
    symbol: const DEFAULT_OPTIONS = {
    title: "`DEFAULT_OPTIONS`, from which the discovery tests build `DEFAULT_V1_OPTIONS` and `DEFAULT_V2_OPTIONS`"
---

# Where it lives

- Enforced by: `DEFAULT_V1_OPTIONS` and `DEFAULT_V2_OPTIONS` in the discovery tests (`test.ts`), built from `DEFAULT_OPTIONS`, which must match the v1 and v2 endpoint reset keys, and the per-provider specs; otherwise review only.[^bin-test-defaults]
- The reset sentinel: `ResetValue` and `RESET_VALUE` in `options.ts` under `src/common`.[^reset-value]
- Which keys are reset, and when: `RESETTABLE_OPTIONS`, `initEndpoint`, `initV1Endpoint` and `initV2Endpoint` in `manifest.ts`; `stackToWire` writes them as `null`.[^resettable-options][^init-endpoint][^stack-to-wire]
- Global options and conversion: `setGlobalOptions`, `getGlobalOptions`, `optionsToEndpoint` and `assertTimeoutSecondsValid` in `options.ts` under `src/v2`.[^set-global-options][^options-to-endpoint][^assert-timeout]
- The merge pattern to copy: `onMessagePublished` in `pubsub.ts`.[^pubsub-merge]

# Decision

## Resets

The function's source is its whole configuration. Every key in `RESETTABLE_OPTIONS` starts as `RESET_VALUE` on each endpoint, so an option the user removes from source is reset to the platform default on the next deploy.[^resettable-options][^init-endpoint] Setting `preserveExternalChanges` skips the resets. If either the global or the per-function value is `true`, the resets are skipped; a per-function `false` does not override a global `true`.[^preserve-external-changes][^init-endpoint] v1 endpoints leave `concurrency` out of the reset set.[^init-endpoint] Task queue and schedule triggers have their own reset sets in the same file.

`RESET_VALUE` is also a value users can pass, so most option types accept `ResetValue` alongside literals and `Expression`.[^reset-value]

## Merging

There is no shared merge helper. Each v2 provider spreads, in order: `initV2Endpoint(globalOptions, opts)`, the global options converted by `optionsToEndpoint`, then its own options converted with its `TimeoutKind`, and merges the two `labels` objects key by key, with the function's value winning.[^pubsub-merge] Event triggers set `retry` to `false` unless the function sets it; `retry` is not a global option.[^pubsub-merge]

## Timeouts

`assertTimeoutSecondsValid` checks a literal `timeoutSeconds`, falling back to the global value, against the limit for its `TimeoutKind`, and skips `Expression` and `RESET_VALUE`. It runs at definition time, so a bad value throws when the function is defined rather than at deploy.[^assert-timeout]

## Global options

`setGlobalOptions` stores one object on `globalThis`. A second call logs a warning and replaces the stored object; functions defined before it keep the earlier options.[^set-global-options]

# Why

The maintainers' stated reason, in the TSDoc of `preserveExternalChanges`: without it, configuration set outside the source (for example in the console) is wiped when a later SDK release starts managing that setting.[^preserve-external-changes] The likely reason for resetting by default (not recorded): it keeps the deployed function matching the source.

The reason there is no shared merge helper isn't recorded.

# Rules for agents

- **Must:** when adding a resettable endpoint option, add it to `RESETTABLE_OPTIONS` and to the matching `DEFAULT_*_OPTIONS` in the discovery tests or, for a trigger's reset set, to that trigger's expected output in the provider specs, in the same PR.
- **Ask first:** before adding a key to any reset set. It is then emitted on every endpoint of every user, and an older firebase-tools rejects keys it doesn't know. See [Manifest schema and CLI version skew](/contracts/manifest-and-discovery.md).
- **Must:** in a new v2 provider, copy the merge order and the `labels` deep merge from an existing provider, and pass the right `TimeoutKind` to `optionsToEndpoint`.
- **Must:** default an event trigger's `retry` to `false`, as the other providers do.
- **Must:** accept `RESET_VALUE` wherever an option is resettable, and keep `Expression` values unresolved (see [Params stay Expressions](/params/expressions.md)).
- **Should:** add a new `TimeoutKind` case to `assertTimeoutSecondsValid` rather than validating timeouts inside a provider.

# Related

- [Manifest schema and CLI version skew](/contracts/manifest-and-discovery.md)
- [Params stay Expressions until the handler runs](/params/expressions.md)
- [Adding a provider or subpath](/playbooks/add-provider-or-subpath.md)
- [Shared state between CJS and ESM copies](/architecture/dual-package-shared-state.md)

[^reset-value]: `ResetValue` in `src/common/options.ts`
[^resettable-options]: `RESETTABLE_OPTIONS`
[^init-endpoint]: `initEndpoint` and its callers
[^stack-to-wire]: `stackToWire`
[^preserve-external-changes]: `preserveExternalChanges` TSDoc
[^set-global-options]: `setGlobalOptions`
[^options-to-endpoint]: `optionsToEndpoint`
[^assert-timeout]: `assertTimeoutSecondsValid`
[^pubsub-merge]: `onMessagePublished` in `pubsub.ts`
[^bin-test-defaults]: `DEFAULT_OPTIONS`, `DEFAULT_V1_OPTIONS` and `DEFAULT_V2_OPTIONS` in the discovery tests
