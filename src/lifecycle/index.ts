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

/**
 * Use a global singleton to manage the list of declared lifecycle hooks.
 *
 * This ensures that lifecycle hooks are shared between CJS and ESM builds,
 * avoiding the "dual-package hazard" where the src/bin/firebase-functions.ts (CJS) sees
 * an empty list while the user's code (ESM) populates a different list.
 */
const majorVersion =
  // @ts-expect-error __FIREBASE_FUNCTIONS_MAJOR_VERSION__ is injected at build time
  typeof __FIREBASE_FUNCTIONS_MAJOR_VERSION__ !== "undefined"
    ? // @ts-expect-error __FIREBASE_FUNCTIONS_MAJOR_VERSION__ is injected at build time
      __FIREBASE_FUNCTIONS_MAJOR_VERSION__
    : "0";

const GLOBAL_SYMBOL = Symbol.for(`firebase-functions:lifecycle:declaredHooks:v${majorVersion}`);
const globalSymbols = globalThis as unknown as Record<symbol, Record<string, LifecycleAction>>;

if (!globalSymbols[GLOBAL_SYMBOL]) {
  globalSymbols[GLOBAL_SYMBOL] = {};
}

/**
 * Singleton dictionary of declared lifecycle hooks.
 * @internal
 */
export const declaredLifecycleHooks: Record<string, LifecycleAction> = globalSymbols[GLOBAL_SYMBOL];

/**
 * Registers an action to be executed automatically post-deployment when resources in this codebase
 * are installed for the initial time.
 *
 * @param action The lifecycle action to execute.
 */
export function afterInstall(action: LifecycleAction): void {
  if (declaredLifecycleHooks.afterInstall) {
    throw new Error("Only one afterInstall lifecycle hook is allowed per codebase.");
  }
  declaredLifecycleHooks.afterInstall = action;
}

/**
 * Registers an action to be executed automatically post-deployment when resources in this codebase
 * are updated.
 *
 * @param action The lifecycle action to execute.
 */
export function afterUpdate(action: LifecycleAction): void {
  if (declaredLifecycleHooks.afterUpdate) {
    throw new Error("Only one afterUpdate lifecycle hook is allowed per codebase.");
  }
  declaredLifecycleHooks.afterUpdate = action;
}

/**
 * Helper to clear declared lifecycle hooks.
 * @internal
 */
export function clearDeclaredLifecycleHooks(): void {
  for (const key of Object.keys(declaredLifecycleHooks)) {
    delete declaredLifecycleHooks[key];
  }
}
