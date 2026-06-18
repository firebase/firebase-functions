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

import { registerRole } from "../security/roles";

/**
 * A TypeScript literal type for IAM roles to provide compile-time validation.
 */
export type Role =
  | `roles/${string}.${string}`
  | `projects/${string}/roles/${string}`
  | `organizations/${string}/roles/${string}`;

/**
 * Declares that this codebase requires the specified IAM role to operate.
 * When deployed, the Firebase CLI will automatically provision a managed service account
 * with this role and attach it to all functions in this codebase.
 * @param role The IAM role required (e.g. "roles/bigquery.dataEditor")
 */
export function requiresRole(role: Role): void {
  const roleRegex =
    /^(roles\/[a-zA-Z0-9_.-]+|projects\/[a-zA-Z0-9_-]+\/roles\/[a-zA-Z0-9_.-]+|organizations\/[a-zA-Z0-9_-]+\/roles\/[a-zA-Z0-9_.-]+)$/;
  if (!roleRegex.test(role)) {
    throw new Error(
      `Invalid role: "${role}". Role must be a valid GCP IAM role format (e.g., "roles/viewer", "projects/<project-id>/roles/<custom-role>", or "organizations/<org-id>/roles/<custom-role>").`
    );
  }
  registerRole(role);
}
