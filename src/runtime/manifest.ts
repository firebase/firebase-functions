// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in
// all copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { Expression } from "../params";
import { WireParamSpec } from "../params/types";

/**
 * An definition of a function as appears in the Manifest.
 */
export interface ManifestEndpoint {
  entryPoint?: string;
  region?: string[];
  platform?: string;
  availableMemoryMb?: number | Expression<number>;
  maxInstances?: number | Expression<number>;
  minInstances?: number | Expression<number>;
  concurrency?: number | Expression<number>;
  serviceAccountEmail?: string;
  timeoutSeconds?: number | Expression<number>;
  cpu?: number | "gcf_gen1";
  vpc?: {
    connector: string | Expression<string>;
    egressSettings?: string;
  };
  labels?: Record<string, string>;
  ingressSettings?: string;
  environmentVariables?: Record<string, string>;
  secretEnvironmentVariables?: Array<{ key: string; secret?: string }>;

  httpsTrigger?: {
    invoker?: string[];
  };

  callableTrigger?: Record<string, never>;

  eventTrigger?: {
    eventFilters: Record<string, string | Expression<string>>;
    eventFilterPathPatterns?: Record<string, string | Expression<string>>;
    channel?: string;
    eventType: string;
    retry: boolean | Expression<boolean>;
    region?: string;
    serviceAccountEmail?: string;
  };

  scheduleTrigger?: {
    schedule?: string | Expression<string>;
    timeZone?: string | Expression<string>;
    retryConfig?: {
      retryCount?: number | Expression<number>;
      maxRetrySeconds?: string | Expression<string>;
      minBackoffSeconds?: string | Expression<string>;
      maxBackoffSeconds?: string | Expression<string>;
      maxDoublings?: number | Expression<number>;
    };
  };

  blockingTrigger?: {
    eventType: string;
    options?: Record<string, unknown>;
  };
}

export interface ManifestRequiredAPI {
  api: string;
  reason: string;
}

/**
 * An definition of a function deployment as appears in the Manifest.
 */
export interface ManifestStack {
  specVersion: "v1alpha1";
  params?: WireParamSpec<any>[];
  requiredAPIs: ManifestRequiredAPI[];
  endpoints: Record<string, ManifestEndpoint>;
}

/**
 * Returns the JSON representation of a ManifestStack, which has CEL
 * expressions in its options as object types, with its expressions
 * transformed into the actual CEL strings.
 * @internal
 */
export function stackToWire(stack: ManifestStack): Record<string, unknown> {
  for (const param of stack.params) {
    if ("text" in param.input && param.input.text.validationRegex instanceof RegExp) {
      param.input.text.validationRegex = param.input.text.validationRegex.source;
    }
  }

  const wireStack = stack as any;
  const traverse = function traverse(obj: Record<string, unknown>) {
    for (const [key, val] of Object.entries(obj)) {
      if (val instanceof Expression) {
        obj[key] = val.toCEL();
      } else if (typeof val === "object") {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        traverse(val as any);
      }
    }
  };
  traverse(wireStack.endpoints);
  return wireStack;
}
