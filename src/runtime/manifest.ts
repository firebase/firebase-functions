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

import { RESET_VALUE, ResettableKeys, ResetValue } from "../common/options";
import { Expression } from "../params";
import { WireParamSpec, SecretParam } from "../params/types";

/**
 * A definition of an extension as appears in the Manifest.
 * Exactly one of ref or localPath must be present.
 */
export interface ManifestExtension {
  params: Record<string, string | SecretParam>;
  ref?: string;
  localPath?: string;
  events: string[];
}

/**
 * A definition of a function as appears in the Manifest.
 *
 * @alpha
 */
export interface ManifestEndpoint {
  entryPoint?: string;
  region?: string[];
  omit?: boolean | Expression<boolean>;
  platform?: string;
  availableMemoryMb?: number | Expression<number> | ResetValue;
  maxInstances?: number | Expression<number> | ResetValue;
  minInstances?: number | Expression<number> | ResetValue;
  concurrency?: number | Expression<number> | ResetValue;
  timeoutSeconds?: number | Expression<number> | ResetValue;
  vpc?:
    | {
        connector: string | Expression<string>;
        egressSettings?: string | Expression<string> | ResetValue;
      }
    | ResetValue;
  serviceAccountEmail?: string | Expression<string> | ResetValue;
  cpu?: number | "gcf_gen1";
  labels?: Record<string, string>;
  ingressSettings?: string | Expression<string> | ResetValue;
  environmentVariables?: Record<string, string>;
  secretEnvironmentVariables?: Array<{ key: string; secret?: string }>;

  httpsTrigger?: {
    invoker?: string[];
  };

  callableTrigger?: {
    genkitAction?: string;
  };

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
    attemptDeadline?: string | Expression<string> | ResetValue;
  };

  blockingTrigger?: {
    eventType: string;
    options?: Record<string, unknown>;
  };
}

/**
 * Description of API required for this stack.
 * @alpha
 */
export interface ManifestRequiredAPI {
  api: string;
  reason: string;
}

/**
 * A definition of a function/extension deployment as appears in the Manifest.
 *
 * @alpha
 */
export interface ManifestStack {
  specVersion: "v1alpha1";
  params?: WireParamSpec<any>[];
  requiredAPIs: ManifestRequiredAPI[];
  endpoints: Record<string, ManifestEndpoint>;
  extensions?: Record<string, ManifestExtension>;
}

/**
 * Returns the JSON representation of a ManifestStack, which has CEL
 * expressions in its options as object types, with its expressions
 * transformed into the actual CEL strings.
 *
 * @alpha
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

const RESETTABLE_OPTIONS: ResettableKeys<ManifestEndpoint> = {
  availableMemoryMb: null,
  timeoutSeconds: null,
  minInstances: null,
  maxInstances: null,
  ingressSettings: null,
  concurrency: null,
  serviceAccountEmail: null,
  vpc: null,
};

interface ManifestOptions {
  preserveExternalChanges?: boolean;
}

function initEndpoint(
  resetOptions: Record<string, unknown>,
  ...opts: ManifestOptions[]
): ManifestEndpoint {
  const endpoint: ManifestEndpoint = {};
  if (opts.every((opt) => !opt?.preserveExternalChanges)) {
    for (const key of Object.keys(resetOptions)) {
      endpoint[key] = RESET_VALUE;
    }
  }
  return endpoint;
}

/**
 * @internal
 */
export function initV1Endpoint(...opts: ManifestOptions[]): ManifestEndpoint {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { concurrency, ...resetOpts } = RESETTABLE_OPTIONS;
  return initEndpoint({ ...resetOpts }, ...opts);
}

/**
 * @internal
 */
export function initV2Endpoint(...opts: ManifestOptions[]): ManifestEndpoint {
  return initEndpoint(RESETTABLE_OPTIONS, ...opts);
}

const RESETTABLE_RETRY_CONFIG_OPTIONS: ResettableKeys<
  ManifestEndpoint["taskQueueTrigger"]["retryConfig"]
> = {
  maxAttempts: null,
  maxDoublings: null,
  maxBackoffSeconds: null,
  maxRetrySeconds: null,
  minBackoffSeconds: null,
};

const RESETTABLE_RATE_LIMITS_OPTIONS: ResettableKeys<
  ManifestEndpoint["taskQueueTrigger"]["rateLimits"]
> = {
  maxConcurrentDispatches: null,
  maxDispatchesPerSecond: null,
};

/**
 * @internal
 */
export function initTaskQueueTrigger(
  ...opts: ManifestOptions[]
): ManifestEndpoint["taskQueueTrigger"] {
  const taskQueueTrigger: ManifestEndpoint["taskQueueTrigger"] = {
    retryConfig: {},
    rateLimits: {},
  };
  if (opts.every((opt) => !opt?.preserveExternalChanges)) {
    for (const key of Object.keys(RESETTABLE_RETRY_CONFIG_OPTIONS)) {
      taskQueueTrigger.retryConfig[key] = RESET_VALUE;
    }
    for (const key of Object.keys(RESETTABLE_RATE_LIMITS_OPTIONS)) {
      taskQueueTrigger.rateLimits[key] = RESET_VALUE;
    }
  }
  return taskQueueTrigger;
}

const RESETTABLE_V1_SCHEDULE_OPTIONS: Omit<
  ResettableKeys<ManifestEndpoint["scheduleTrigger"]["retryConfig"]>,
  "maxBackoffSeconds" | "minBackoffSeconds" | "maxRetrySeconds"
> = {
  retryCount: null,
  maxDoublings: null,
  maxRetryDuration: null,
  maxBackoffDuration: null,
  minBackoffDuration: null,
};

const RESETTABLE_V2_SCHEDULE_OPTIONS: Omit<
  ResettableKeys<ManifestEndpoint["scheduleTrigger"]["retryConfig"]>,
  "maxRetryDuration" | "maxBackoffDuration" | "minBackoffDuration"
> = {
  retryCount: null,
  maxDoublings: null,
  maxRetrySeconds: null,
  minBackoffSeconds: null,
  maxBackoffSeconds: null,
};

function initScheduleTrigger(
  resetOptions: Record<string, unknown>,
  schedule: string | Expression<string>,
  ...opts: ManifestOptions[]
): ManifestEndpoint["scheduleTrigger"] {
  let scheduleTrigger: ManifestEndpoint["scheduleTrigger"] = {
    schedule,
    retryConfig: {},
  };
  if (opts.every((opt) => !opt?.preserveExternalChanges)) {
    for (const key of Object.keys(resetOptions)) {
      scheduleTrigger.retryConfig[key] = RESET_VALUE;
    }
    scheduleTrigger = { ...scheduleTrigger, timeZone: RESET_VALUE, attemptDeadline: RESET_VALUE };
  }
  return scheduleTrigger;
}

/**
 * @internal
 */
export function initV1ScheduleTrigger(
  schedule: string | Expression<string>,
  ...opts: ManifestOptions[]
): ManifestEndpoint["scheduleTrigger"] {
  return initScheduleTrigger(RESETTABLE_V1_SCHEDULE_OPTIONS, schedule, ...opts);
}

/**
 * @internal
 */
export function initV2ScheduleTrigger(
  schedule: string | Expression<string>,
  ...opts: ManifestOptions[]
): ManifestEndpoint["scheduleTrigger"] {
  return initScheduleTrigger(RESETTABLE_V2_SCHEDULE_OPTIONS, schedule, ...opts);
}
