// The MIT License (MIT)
//
// Copyright (c) 2026 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

export interface TaskAction {
  function: string;
  body?: Record<string, unknown>;
}

export interface CallAction {
  function: string;
  params?: Record<string, unknown>;
}

export type HttpAction = ({ function: string } | { url: string }) & {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
};

export type LifecycleAction =
  | { task: TaskAction; call?: never; http?: never }
  | { call: CallAction; task?: never; http?: never }
  | { http: HttpAction; task?: never; call?: never };

import { globalManifest } from "../runtime/manifest";

function getDeclaredHooks(): Record<string, LifecycleAction> {
  if (!globalManifest.lifecycleHooks || typeof globalManifest.lifecycleHooks !== "object") {
    globalManifest.lifecycleHooks = {};
  }
  return globalManifest.lifecycleHooks as Record<string, LifecycleAction>;
}

function getExistingDeclaredHooks(): Record<string, LifecycleAction> {
  if (!globalManifest.lifecycleHooks || typeof globalManifest.lifecycleHooks !== "object") {
    return {};
  }
  return globalManifest.lifecycleHooks as Record<string, LifecycleAction>;
}

/**
 * Shared dictionary of declared lifecycle hooks.
 *
 * NOTE: A Proxy is necessary here because `lifecycleHooks` is only initialized
 * on `globalManifest` when hooks are registered (to avoid emitting empty `{}`
 * into the manifest). The Proxy dynamically delegates all property reads, writes,
 * and key enumerations directly to `globalManifest.lifecycleHooks` on `globalThis`,
 * ensuring dual-package hazard protection across ESM/CJS or duplicate module contexts.
 *
 * @internal
 */
export const declaredLifecycleHooks: Record<string, LifecycleAction> = new Proxy(
  {},
  {
    get(_, prop) {
      if (typeof prop === "string") {
        return getExistingDeclaredHooks()[prop];
      }
      return undefined;
    },
    set(_, prop, value) {
      if (typeof prop === "string") {
        getDeclaredHooks()[prop] = value as LifecycleAction;
        return true;
      }
      return false;
    },
    deleteProperty(_, prop) {
      if (typeof prop === "string") {
        delete getExistingDeclaredHooks()[prop];
        return true;
      }
      return false;
    },
    has(_, prop) {
      return Reflect.has(getExistingDeclaredHooks(), prop);
    },
    ownKeys() {
      return Reflect.ownKeys(getExistingDeclaredHooks());
    },
    getOwnPropertyDescriptor(_, prop) {
      const hooks = getExistingDeclaredHooks();
      if (typeof prop === "string" && prop in hooks) {
        return {
          enumerable: true,
          configurable: true,
          writable: true,
          value: hooks[prop],
        };
      }
      return undefined;
    },
  }
);

/**
 * Registers an action to be executed automatically post-deployment when resources in this codebase
 * are deployed for the first time.
 *
 * @param action The lifecycle action to execute.
 */
export function afterFirstDeploy(action: LifecycleAction): void {
  const hooks = getDeclaredHooks();
  if (hooks.afterFirstDeploy) {
    throw new Error("Only one afterFirstDeploy lifecycle hook is allowed per codebase.");
  }
  hooks.afterFirstDeploy = action;
}

/**
 * Registers an action to be executed automatically post-deployment when resources in this codebase
 * are updated.
 *
 * @param action The lifecycle action to execute.
 */
export function afterRedeploy(action: LifecycleAction): void {
  const hooks = getDeclaredHooks();
  if (hooks.afterRedeploy) {
    throw new Error("Only one afterRedeploy lifecycle hook is allowed per codebase.");
  }
  hooks.afterRedeploy = action;
}

/**
 * Helper to clear declared lifecycle hooks.
 * @internal
 */
export function clearDeclaredLifecycleHooks(): void {
  delete globalManifest.lifecycleHooks;
}
