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

import { globalManifest } from "../runtime/manifest";

const EMPTY_ROLES: readonly string[] = Object.freeze([]);

function getDeclaredRolesList(): readonly string[] {
  if (!Array.isArray(globalManifest.requiredRoles)) {
    return EMPTY_ROLES;
  }
  return globalManifest.requiredRoles as string[];
}

/**
 * Global set of declared IAM roles required by this codebase.
 *
 * NOTE: This cannot be a native `Set` because `globalManifest.requiredRoles`
 * is stored directly as a wire-ready `string[]` on `globalThis` so that
 * any manifest loader (even older harness versions) can simply spread
 * `...globalManifest` without needing role-specific Set-to-Array conversion.
 * `declaredRoles` implements the full `Set` interface for backwards compatibility.
 */
export const declaredRoles = {
  get size(): number {
    return getDeclaredRolesList().length;
  },
  add(role: string): void {
    registerRole(role);
  },
  delete(role: string): boolean {
    if (!Array.isArray(globalManifest.requiredRoles)) {
      return false;
    }
    const roles = globalManifest.requiredRoles as string[];
    const idx = roles.indexOf(role);
    if (idx !== -1) {
      roles.splice(idx, 1);
      return true;
    }
    return false;
  },
  has(role: string): boolean {
    return getDeclaredRolesList().includes(role);
  },
  clear(): void {
    delete globalManifest.requiredRoles;
  },
  keys(): IterableIterator<string> {
    return getDeclaredRolesList()[Symbol.iterator]();
  },
  values(): IterableIterator<string> {
    return getDeclaredRolesList()[Symbol.iterator]();
  },
  *entries(): IterableIterator<[string, string]> {
    for (const role of getDeclaredRolesList()) {
      yield [role, role];
    }
  },
  [Symbol.iterator](): IterableIterator<string> {
    return getDeclaredRolesList()[Symbol.iterator]();
  },
  forEach(callback: (value: string, value2: string, set: typeof declaredRoles) => void): void {
    for (const role of getDeclaredRolesList()) {
      callback(role, role, declaredRoles);
    }
  },
};

/**
 * Registers a role to be required by this codebase.
 * Automatically deduplicates roles in globalManifest.requiredRoles.
 * @internal
 */
export function registerRole(role: string): void {
  if (!Array.isArray(globalManifest.requiredRoles)) {
    globalManifest.requiredRoles = [];
  }
  const roles = globalManifest.requiredRoles as string[];
  if (!roles.includes(role)) {
    roles.push(role);
  }
}
