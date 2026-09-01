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

export const declaredLifecycleHooks: Record<string, LifecycleAction> = {};

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
  declaredLifecycleHooks.afterFirstDeploy = action;
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
  declaredLifecycleHooks.afterRedeploy = action;
}

/**
 * Helper to clear declared lifecycle hooks.
 * @internal
 */
export function clearDeclaredLifecycleHooks(): void {
  for (const key of Object.keys(declaredLifecycleHooks)) {
    delete declaredLifecycleHooks[key];
  }
  delete globalManifest.lifecycleHooks;
}
