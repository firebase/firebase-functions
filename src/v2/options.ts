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

/**
 * Options to configure cloud functions.
 * @packageDocumentation
 */

import {
  convertIfPresent,
  copyIfPresent,
  durationFromSeconds,
  serviceAccountFromShorthand,
} from "../common/encoding";
import { RESET_VALUE, ResetValue } from "../common/options";
import { ManifestEndpoint } from "../runtime/manifest";
import { TriggerAnnotation } from "./core";
import { declaredParams, Expression } from "../params";
import { ParamSpec, SecretParam } from "../params/types";
import { HttpsOptions } from "./providers/https";
import * as logger from "../logger";

export { RESET_VALUE } from "../common/options";

/**
 * List of all regions supported by Cloud Functions v2
 */
export type SupportedRegion =
  | "asia-east1"
  | "asia-northeast1"
  | "asia-northeast2"
  | "europe-north1"
  | "europe-west1"
  | "europe-west4"
  | "us-central1"
  | "us-east1"
  | "us-east4"
  | "us-west1"
  | "asia-east2"
  | "asia-northeast3"
  | "asia-southeast1"
  | "asia-southeast2"
  | "asia-south1"
  | "australia-southeast1"
  | "europe-central2"
  | "europe-west2"
  | "europe-west3"
  | "europe-west6"
  | "northamerica-northeast1"
  | "southamerica-east1"
  | "us-west2"
  | "us-west3"
  | "us-west4";

/**
 * List of available memory options supported by Cloud Functions.
 */
export type MemoryOption =
  | "128MiB"
  | "256MiB"
  | "512MiB"
  | "1GiB"
  | "2GiB"
  | "4GiB"
  | "8GiB"
  | "16GiB"
  | "32GiB";

const MemoryOptionToMB: Record<MemoryOption, number> = {
  "128MiB": 128,
  "256MiB": 256,
  "512MiB": 512,
  "1GiB": 1024,
  "2GiB": 2048,
  "4GiB": 4096,
  "8GiB": 8192,
  "16GiB": 16384,
  "32GiB": 32768,
};

/**
 * List of available options for VpcConnectorEgressSettings.
 */
export type VpcEgressSetting = "PRIVATE_RANGES_ONLY" | "ALL_TRAFFIC";

/**
 * List of available options for IngressSettings.
 */
export type IngressSetting = "ALLOW_ALL" | "ALLOW_INTERNAL_ONLY" | "ALLOW_INTERNAL_AND_GCLB";

/**
 * GlobalOptions are options that can be set across an entire project.
 * These options are common to HTTPS and Event handling functions.
 */
export interface GlobalOptions {
  /**
   * If true, do not deploy or emulate this function.
   */
  omit?: boolean | Expression<boolean>;

  /**
   * Region where functions should be deployed.
   */
  region?: SupportedRegion | string | Expression<string> | ResetValue;

  /**
   * Amount of memory to allocate to a function.
   */
  memory?: MemoryOption | Expression<number> | ResetValue;

  /**
   * Timeout for the function in seconds, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   *
   * @remarks
   * The minimum timeout for a gen 2 function is 1s. The maximum timeout for a
   * function depends on the type of function: Event handling functions have a
   * maximum timeout of 540s (9 minutes). HTTPS and callable functions have a
   * maximum timeout of 36,00s (1 hour). Task queue functions have a maximum
   * timeout of 1,800s (30 minutes)
   */
  timeoutSeconds?: number | Expression<number> | ResetValue;

  /**
   * Min number of actual instances to be running at a given time.
   *
   * @remarks
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   */
  minInstances?: number | Expression<number> | ResetValue;

  /**
   * Max number of instances to be running in parallel.
   */
  maxInstances?: number | Expression<number> | ResetValue;

  /**
   * Number of requests a function can serve at once.
   *
   * @remarks
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: number | Expression<number> | ResetValue;

  /**
   * Fractional number of CPUs to allocate to a function.
   *
   * @remarks
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | "gcf_gen1";

  /**
   * Connect cloud function to specified VPC connector.
   */
  vpcConnector?: string | Expression<string> | ResetValue;

  /**
   * Egress settings for VPC connector.
   */
  vpcConnectorEgressSettings?: VpcEgressSetting | ResetValue;

  /**
   * Specific service account for the function to run as.
   */
  serviceAccount?: string | Expression<string> | ResetValue;

  /**
   * Ingress settings which control where this function can be called from.
   */
  ingressSettings?: IngressSetting | ResetValue;

  /**
   * Invoker to set access control on https functions.
   */
  invoker?: "public" | "private" | string | string[];

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a function.
   */
  secrets?: (string | SecretParam)[];

  /**
   * Determines whether Firebase AppCheck is enforced. Defaults to false.
   *
   * @remarks
   * When true, requests with invalid tokens autorespond with a 401
   * (Unauthorized) error.
   * When false, requests with invalid tokens set event.app to undefined.
   */
  enforceAppCheck?: boolean;

  /**
   * Controls whether function configuration modified outside of function source is preserved. Defaults to false.
   *
   * @remarks
   * When setting configuration available in the underlying platform that is not yet available in the Firebase Functions
   * SDK, we highly recommend setting `preserveExternalChanges` to `true`. Otherwise, when the Firebase Functions SDK releases
   * a new version of the SDK with support for the missing configuration, your function's manually configured setting
   * may inadvertently be wiped out.
   */
  preserveExternalChanges?: boolean;
}

let globalOptions: GlobalOptions | undefined;

/**
 * Sets default options for all functions written using the v2 SDK.
 * @param options Options to set as default
 */
export function setGlobalOptions(options: GlobalOptions) {
  if (globalOptions) {
    logger.warn("Calling setGlobalOptions twice leads to undefined behavior");
  }
  globalOptions = options;
}

/**
 * Get the currently set default options.
 * Used only for trigger generation.
 * @internal
 */
export function getGlobalOptions(): GlobalOptions {
  return globalOptions || {};
}

/**
 * Additional fields that can be set on any event-handling Cloud Function.
 */
export interface EventHandlerOptions extends Omit<GlobalOptions, "enforceAppCheck"> {
  eventType?: string;

  eventFilters?: Record<string, string | Expression<string>>;
  eventFilterPathPatterns?: Record<string, string | Expression<string>>;

  /** Whether failed executions should be delivered again. */
  retry?: boolean | Expression<boolean> | ResetValue;

  /** Region of the EventArc trigger. */
  // region?: string | Expression<string> | null;
  region?: string | Expression<string> | ResetValue;

  /** The service account that EventArc should use to invoke this function. Requires the P4SA to have ActAs permission on this service account. */
  serviceAccount?: string | Expression<string> | ResetValue;

  /** The name of the channel where the function receives events. */
  channel?: string;
}

/**
 * Apply GlobalOptions to trigger definitions.
 * @internal
 */
export function optionsToTriggerAnnotations(
  opts: GlobalOptions | EventHandlerOptions | HttpsOptions
): TriggerAnnotation {
  const annotation: TriggerAnnotation = {};
  copyIfPresent(
    annotation,
    opts,
    "concurrency",
    "minInstances",
    "maxInstances",
    "ingressSettings",
    "labels",
    "vpcConnector",
    "vpcConnectorEgressSettings",
    "secrets"
  );
  convertIfPresent(annotation, opts, "availableMemoryMb", "memory", (mem: MemoryOption) => {
    return MemoryOptionToMB[mem];
  });
  convertIfPresent(annotation, opts, "regions", "region", (region) => {
    if (typeof region === "string") {
      return [region];
    }
    return region;
  });
  convertIfPresent(
    annotation,
    opts,
    "serviceAccountEmail",
    "serviceAccount",
    serviceAccountFromShorthand
  );
  convertIfPresent(annotation, opts, "timeout", "timeoutSeconds", durationFromSeconds);
  convertIfPresent(
    annotation,
    opts as any as EventHandlerOptions,
    "failurePolicy",
    "retry",
    (retry: boolean) => {
      return retry ? { retry: true } : null;
    }
  );

  return annotation;
}

/**
 * Apply GlobalOptions to endpoint manifest.
 * @internal
 */
export function optionsToEndpoint(
  opts: GlobalOptions | EventHandlerOptions | HttpsOptions
): ManifestEndpoint {
  const endpoint: ManifestEndpoint = {};
  copyIfPresent(
    endpoint,
    opts,
    "omit",
    "concurrency",
    "minInstances",
    "maxInstances",
    "ingressSettings",
    "labels",
    "timeoutSeconds",
    "cpu"
  );
  convertIfPresent(endpoint, opts, "serviceAccountEmail", "serviceAccount");
  if (opts.vpcConnector !== undefined) {
    if (opts.vpcConnector === null || opts.vpcConnector instanceof ResetValue) {
      endpoint.vpc = RESET_VALUE;
    } else {
      const vpc: ManifestEndpoint["vpc"] = { connector: opts.vpcConnector };
      convertIfPresent(vpc, opts, "egressSettings", "vpcConnectorEgressSettings");
      endpoint.vpc = vpc;
    }
  }
  convertIfPresent(
    endpoint,
    opts,
    "availableMemoryMb",
    "memory",
    (
      mem: MemoryOption | Expression<number> | ResetValue | null
    ): number | Expression<number> | null | ResetValue => {
      return typeof mem === "object" ? mem : MemoryOptionToMB[mem];
    }
  );
  convertIfPresent(endpoint, opts, "region", "region", (region) => {
    if (typeof region === "string") {
      return [region];
    }
    return region;
  });
  convertIfPresent(
    endpoint,
    opts,
    "secretEnvironmentVariables",
    "secrets",
    (secrets: (string | SecretParam)[]) =>
      secrets.map((secret) => ({ key: secret instanceof SecretParam ? secret.name : secret }))
  );

  return endpoint;
}

/**
 * @hidden
 * @alpha
 */
export function __getSpec(): {
  globalOptions: GlobalOptions;
  params: ParamSpec<any>[];
} {
  return {
    globalOptions: getGlobalOptions(),
    params: declaredParams.map((p) => p.toSpec()),
  };
}
