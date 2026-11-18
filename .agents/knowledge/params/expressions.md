---
type: Constraint
title: Params stay Expressions until the handler runs
description: "Param values are resolved by firebase-tools after discovery, so SDK code passes an `Expression` into the manifest as CEL and calls `.value()` only inside a handler; the CEL forms, param types and list encoding are a contract with the CLI."
tags: [params, manifest, firebase-tools]
agents_md: always
governs:
  - src/params/**
  - spec/params/**
sources:
  - id: expression-value
    resource: ../../../src/params/types.ts
    symbol: invoked during function deployment, instead of during runtime.
    title: "`Expression.value`, which warns when called during discovery"
  - id: secret-value
    resource: ../../../src/params/types.ts
    symbol: Cannot access the value of secret
    title: "`SecretParam.value`, which throws during discovery"
  - id: value-of
    resource: ../../../src/params/types.ts
    symbol: export function valueOf<
    title: "`valueOf` and `celOf`, the helpers for a value that may be an `Expression`"
  - id: to-spec
    resource: ../../../src/params/types.ts
    symbol: "toSpec(): WireParamSpec<T>"
    title: "`Param.toSpec`, which writes a param's manifest entry"
  - id: param-value-type
    resource: ../../../src/params/types.ts
    symbol: type ParamValueType =
    title: The param types the SDK can emit
  - id: list-param
    resource: ../../../src/params/types.ts
    symbol: export class ListParam
    title: "`ListParam`, which parses its value as JSON"
  - id: register-param
    resource: ../../../src/params/index.ts
    symbol: function registerParam(
    title: "`registerParam`, which replaces a param of the same name"
  - id: clear-params
    resource: ../../../src/params/index.ts
    symbol: export function clearParams()
    title: "`clearParams`, for tests"
  - id: firestore-runtime
    resource: ../../../src/v2/providers/firestore.ts
    symbol: document.value()
    title: Firestore triggers resolve the document path inside the handler
  - id: https-oncall
    resource: ../../../src/v2/providers/https.ts
    symbol: enforceAppCheck = enforceAppCheck.value();
    title: "`onCall`, which resolves its App Check options when the function is defined"
  - id: params-spec
    resource: ../../../spec/params/params.spec.ts
    title: Param unit tests
  - id: cli-discovery-order
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/prepare.ts
    symbol: discoverBuild
    title: firebase-tools runs discovery with the `.env` values, then resolves params
  - id: cli-cel
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/cel.ts
    symbol: resolveExpression
    title: The CEL forms firebase-tools can resolve
  - id: cli-params
    resource: https://github.com/firebase/firebase-tools/blob/main/src/deploy/functions/params.ts
    symbol: canSatisfyParam
    title: How firebase-tools resolves, prompts for and encodes param values
---

# Where it lives

- Enforced by: the warning in `Expression.value` and the error in `SecretParam.value`, both raised only when `FUNCTIONS_CONTROL_API` is `true`; otherwise review only.[^expression-value][^secret-value]
- How a param becomes a manifest entry: `Param.toSpec` in `types.ts`, and `ParamValueType` for the types it can emit.[^to-spec][^param-value-type]
- Resolving a value that may be an `Expression`: `valueOf` and `celOf` in `types.ts`.[^value-of]
- Registration and the test reset: `registerParam` and `clearParams` in `index.ts`, tested in `params.spec.ts`.[^register-param][^clear-params][^params-spec]
- The CLI side: firebase-tools `cel.ts` and `params.ts` (symbols named below).[^cli-cel][^cli-params]

# Constraint

firebase-tools loads the functions source to read the manifest, and only then resolves param values (defaults, prompts, secrets) and writes them into each function's environment. During discovery the process sees `.env` values but nothing the CLI resolves afterwards.[^cli-discovery-order] So an option that takes a param must reach the manifest as the `Expression` itself, serialized to CEL, and its value is read only at runtime, inside the handler.

## Definition time versus runtime

`Expression.value()` called while `FUNCTIONS_CONTROL_API` is `true` (during discovery) logs a warning and returns whatever the environment holds, though a `ListParam` with no value in `.env` throws from `JSON.parse`.[^expression-value] `SecretParam.value()` and `JsonSecretParam.value()` throw instead.[^secret-value] Firestore triggers show the right pattern: the document path is resolved inside the wrapped handler.[^firestore-runtime] `onCall` resolves `enforceAppCheck` and `consumeAppCheckToken` when the function is defined, which is the pattern to avoid.[^https-oncall]

## CEL forms

`toCEL` output must be a form firebase-tools can resolve: a bare param reference, a ternary, or a comparison (only where a boolean is expected), through `resolveExpression` in `cel.ts`; or, in string fields only, a string with `{{ }}` blocks that `resolveString` in `params.ts` resolves one by one. Other forms fail the deploy with `ExprParseError`.[^cli-cel]

## Param types and list values

The CLI resolves, prompts for and type-checks each param type separately (`canSatisfyParam`, `resolveDefaultCEL`, `promptParam`).[^cli-params] List values are written to the environment as JSON by `ParamValue.toSDK` and parsed back by `ListParam`.[^list-param]

## Registration

Defining a param with an existing name replaces the earlier one, in the shared list, the legacy versioned list and `globalManifest.params`.[^register-param] These lists live on `globalThis`; see [Shared state between CJS and ESM copies](/architecture/dual-package-shared-state.md).

# Why

The likely reason (not recorded): the CLI needs the manifest to know which params exist before it can resolve or prompt for them, so their values cannot exist yet when the manifest is built.

# Rules for agents

- **Must not:** call `.value()`, `valueOf` or `runtimeValue` on an option at function-definition time in SDK code. Put the `Expression` into the endpoint (the manifest code turns it into CEL), and resolve it inside the handler closure.
- **Must:** make any new `Expression` subclass produce one of the CEL forms above, and test its `toCEL` output.
- **Ask first:** before adding a param type, an input kind or a new CEL form. firebase-tools must support it first, or deploys fail for users on older CLIs.
- **Must:** keep `ListParam` parsing and the CLI's JSON encoding in step.
- **Should:** call `clearParams` in tests that define params, so later tests don't see them.
- **Ask first:** before moving the `onCall` App Check options to runtime resolution. It changes when user code observes the value.

# Related

- [Manifest schema and CLI version skew](/contracts/manifest-and-discovery.md)
- [Shared state between CJS and ESM copies](/architecture/dual-package-shared-state.md)
- [Options, resets and merging](/options/resets-and-merging.md)

[^expression-value]: `Expression.value` in `types.ts`
[^secret-value]: `SecretParam.value` in `types.ts`
[^value-of]: `valueOf` and `celOf`
[^to-spec]: `Param.toSpec`
[^param-value-type]: `ParamValueType`
[^list-param]: `ListParam`
[^register-param]: `registerParam`
[^clear-params]: `clearParams`
[^firestore-runtime]: Firestore handler resolving `document`
[^https-oncall]: `onCall` App Check options
[^params-spec]: `params.spec.ts`
[^cli-discovery-order]: firebase-tools `prepare.ts`
[^cli-cel]: firebase-tools `cel.ts`
[^cli-params]: firebase-tools `params.ts`
