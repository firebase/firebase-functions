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

import { ResetValue } from "../common/options";
import { Expression } from "../params";
import { WireParamSpec } from "../params/types";

/**
 * An definition of a function as appears in the Manifest.
 */
export interface ManifestEndpoint {
  entryPoint?: string;
  region?: string[];
  platform?: string;
  availableMemoryMb?: number | Expression<number> | ResetValue;
  maxInstances?: number | Expression<number> | ResetValue;
  minInstances?: number | Expression<number> | ResetValue;
  concurrency?: number | Expression<number> | ResetValue;
  timeoutSeconds?: number | Expression<number> | ResetValue;
  vpc?: {
    connector: string | Expression<string> | ResetValue;
    egressSettings?: string | Expression<string> | ResetValue;
  };
  ingressSettings?: string | Expression<string> | ResetValue;
  serviceAccountEmail?: string | Expression<string> | ResetValue;
  cpu?: number | "gcf_gen1";
  labels?: Record<string, string>;
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
    retry: boolean | Expression<boolean> | ResetValue;
    region?: string;
    serviceAccountEmail?: string | ResetValue;
  };

  taskQueueTrigger?: {
    retryConfig?: {
      maxAttempts?: number | Expression<number> | ResetValue;
      maxRetrySeconds?: number | Expression<number> | ResetValue;
      maxBackoffSeconds?: number | Expression<number> | ResetValue;
      maxDoublings?: number | Expression<number> | ResetValue;
      minBackoffSeconds?: number | Expression<number> | ResetValue;
    };
    rateLimits?: {
      maxConcurrentDispatches?: number | Expression<number> | ResetValue;
      maxDispatchesPerSecond?: number | Expression<number> | ResetValue;
    };
  };

  scheduleTrigger?: {
    schedule: string | Expression<string>;
    timeZone?: string | Expression<string> | ResetValue;
    retryConfig?: {
      retryCount?: number | Expression<number> | ResetValue;
      maxRetrySeconds?: string | Expression<string> | ResetValue;
      minBackoffSeconds?: string | Expression<string> | ResetValue;
      maxBackoffSeconds?: string | Expression<string> | ResetValue;
      maxDoublings?: number | Expression<number> | ResetValue;
      // Note: v1 schedule functions use *Duration instead of *Seconds
      maxRetryDuration?: string | Expression<string> | ResetValue;
      minBackoffDuration?: string | Expression<string> | ResetValue;
      maxBackoffDuration?: string | Expression<string> | ResetValue;
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
  const wireStack = stack as any;
  const traverse = function traverse(obj: Record<string, unknown>) {
    for (const [key, val] of Object.entries(obj)) {
      if (val instanceof Expression) {
        obj[key] = val.toCEL();
      } else if (val instanceof ResetValue) {
        obj[key] = val.toJSON();
      } else if (typeof val === "object" && val !== null) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
        traverse(val as any);
      }
    }
  };
  traverse(wireStack.endpoints);
  return wireStack;
}
