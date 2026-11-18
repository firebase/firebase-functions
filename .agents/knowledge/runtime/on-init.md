---
type: Constraint
title: Every handler runs the onInit callback first
description: "`onInit` registers a callback that `withInit` runs before the first invocation of any function, so every provider must wrap its handler in `withInit`; the callback never runs during discovery."
tags: [runtime, lifecycle, providers]
agents_md: when-touching
governs:
  - src/common/onInit.ts
  - src/v1/cloud-functions.ts
  - src/v1/providers/**
  - src/v2/providers/**
sources:
  - id: on-init
    resource: ../../../src/common/onInit.ts
    symbol: export function onInit(
    title: "`onInit`, which stores the callback"
  - id: with-init
    resource: ../../../src/common/onInit.ts
    symbol: export function withInit<
    title: "`withInit`, which runs the callback before the first call"
  - id: v1-make-cloud-function
    resource: ../../../src/v1/cloud-functions.ts
    symbol: handler = withInit(
    title: "`makeCloudFunction`, which wraps every v1 event handler"
  - id: v1-https
    resource: ../../../src/v1/providers/https.ts
    symbol: withInit(handler)
    title: v1 `onRequest` and `onCall` wrap with `withInit`
  - id: v1-tasks
    resource: ../../../src/v1/providers/tasks.ts
    symbol: "const func: any = onDispatchHandler(fixedLen);"
    title: v1 `onDispatch`, which does not wrap with `withInit`
  - id: v1-auth-blocking
    resource: ../../../src/v1/providers/auth.ts
    symbol: "const func: any = wrapHandler(eventType, annotatedHandler);"
    title: v1 auth blocking functions, which do not wrap with `withInit`
  - id: v2-tasks
    resource: ../../../src/v2/providers/tasks.ts
    symbol: wrapTraceContext(withInit(onDispatchHandler(fixedLen)))
    title: v2 `onTaskDispatched`, wrapped inside `wrapTraceContext`
  - id: v2-tasks-spec
    resource: ../../../spec/v2/providers/tasks.spec.ts
    symbol: onInit(() => (hello = "world"));
    title: A provider test that checks the callback runs on first invocation
  - id: usage-guide
    resource: ../../../.guides/usage.md
    symbol: onInit(() => {
    title: The published guide that tells users to initialize the Admin SDK in `onInit`
---

# Where it lives

- Enforced by: an `onInit` test in some provider specs, such as `tasks.spec.ts`; otherwise review only.[^v2-tasks-spec]
- The mechanism: `onInit` and `withInit` in `onInit.ts`.[^on-init][^with-init]
- v1 event handlers are wrapped once, in `makeCloudFunction` in `cloud-functions.ts`; v1 HTTPS wraps its own.[^v1-make-cloud-function][^v1-https]
- v2 providers each wrap their own handler, usually as `wrapTraceContext(withInit(...))`, for example in `tasks.ts`.[^v2-tasks]
- Not wrapped: v1 `onDispatch` in `tasks.ts` and the v1 auth blocking handlers in `auth.ts`.[^v1-tasks][^v1-auth-blocking]

# Constraint

`onInit(callback)` only stores the callback. `withInit(handler)` returns an async function that awaits the callback before the first call to any wrapped handler, and then calls the handler.[^on-init][^with-init] Running the callback only once isn't guaranteed, so it should be safe to run more than once. Discovery loads the code but never invokes a handler, so the callback never runs during discovery.

A handler a provider forgets to wrap runs without the user's initialization. The published guide tells users to call `initializeApp` from `onInit`, so an unwrapped handler can run before the Admin SDK is initialized.[^usage-guide]

The state is two module-level variables in `onInit.ts`, not a `globalThis` registry.[^on-init] A second `onInit` call replaces the callback, logs a warning, and makes it run again on the next invocation.

# Why

The maintainers' stated reason, in the `onInit` TSDoc: the callback is for initialization that runs in a production environment before any function code executes.[^on-init] Code at the top level of a functions source also runs during discovery, where params and secrets have no deployed values; discovery never invokes a handler, so the callback doesn't run then. See [Params stay Expressions until the handler runs](/params/expressions.md).

# Rules for agents

- **Must:** wrap every new handler in `withInit`, inside `wrapTraceContext` where the provider uses it, and add a test that the callback runs on first invocation.
- **Must:** pass `withInit` the handler function itself, never the result of calling it.
- **Should:** write `onInit` callbacks so they are safe to run more than once.
- **Ask first:** before adding `withInit` to v1 `onDispatch` or the v1 auth blocking handlers. It is a behaviour change for existing users.
- **Ask first:** before moving the `onInit` state to `globalThis`. Other registries live there (see [Shared state between CJS and ESM copies](/architecture/dual-package-shared-state.md)), but the reason this one doesn't isn't recorded.

# Related

- [Params stay Expressions until the handler runs](/params/expressions.md)
- [Adding a provider or subpath](/playbooks/add-provider-or-subpath.md)
- [Shared state between CJS and ESM copies](/architecture/dual-package-shared-state.md)

[^on-init]: `onInit` in `onInit.ts`
[^with-init]: `withInit` in `onInit.ts`
[^v1-make-cloud-function]: `makeCloudFunction` in `cloud-functions.ts`
[^v1-https]: v1 `https.ts`
[^v1-tasks]: v1 `tasks.ts`
[^v1-auth-blocking]: v1 `auth.ts`
[^v2-tasks]: v2 `tasks.ts`
[^v2-tasks-spec]: `tasks.spec.ts`
[^usage-guide]: `.guides/usage.md`
