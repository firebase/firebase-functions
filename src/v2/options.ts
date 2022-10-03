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

import { convertIfPresent, copyIfPresent } from "../common/encoding";
import { ResetValue } from "../common/options";
import * as logger from "../logger";
import { ManifestEndpoint } from "../runtime/manifest";
import { declaredParams, Expression } from "../params";
import { ParamSpec } from "../params/types";
import { HttpsOptions } from "./providers/https";

export { RESET_VALUE } from "../common/options";

/**
 * List of all regions supported by Cloud Functions v2
 */
export type SupportedRegion =
  | "asia-northeast1"
  | "europe-north1"
  | "europe-west1"
  | "europe-west4"
  | "us-central1"
  | "us-east1"
  | "us-west1";

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
   * Region where functions should be deployed.
   * HTTP functions can override and specify more than one region.
   */
  region?: SupportedRegion | string;

  /**
   * Amount of memory to allocate to a function.
   * A value of null restores the defaults of 256MB.
   */
  memory?: MemoryOption | Expression<number> | ResetValue | null;

  /**
   * Timeout for the function in sections, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   * A value of null restores the default of 60s
   * The minimum timeout for a gen 2 function is 1s. The maximum timeout for a
   * function depends on the type of function: Event handling functions have a
   * maximum timeout of 540s (9 minutes). HTTPS and callable functions have a
   * maximum timeout of 36,00s (1 hour). Task queue functions have a maximum
   * timeout of 1,800s (30 minutes)
   */
  timeoutSeconds?: number | Expression<number> | ResetValue | null;

  /**
   * Min number of actual instances to be running at a given time.
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   * A value of null restores the default min instances.
   */
  minInstances?: number | Expression<number> | ResetValue | null;

  /**
   * Max number of instances to be running in parallel.
   * A value of null restores the default max instances.
   */
  maxInstances?: number | Expression<number> | ResetValue | null;

  /**
   * Number of requests a function can serve at once.
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: number | Expression<number> | ResetValue | null;

  /**
   * Fractional number of CPUs to allocate to a function.
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | "gcf_gen1";

  /**
   * Connect cloud function to specified VPC connector.
   * A value of null removes the VPC connector
   */
  vpcConnector?: string | ResetValue | null;

  /**
   * Egress settings for VPC connector.
   * A value of null turns off VPC connector egress settings
   */
  vpcConnectorEgressSettings?: VpcEgressSetting | ResetValue | null;

  /**
   * Specific service account for the function to run as.
   * A value of null restores the default service account.
   */
  serviceAccount?: string | ResetValue | null;

  /**
   * Ingress settings which control where this function can be called from.
   * A value of null turns off ingress settings.
   */
  ingressSettings?: IngressSetting | ResetValue | null;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /**
   * Invoker to set access control on https functions.
   */
  invoker?: "public" | "private" | string | string[];

  /*
   * Secrets to bind to a function.
   */
  secrets?: string[];

  /**
   * Determines whether Firebase AppCheck is enforced.
   * When true, requests with invalid tokens autorespond with a 401
   * (Unauthorized) error.
   * When false, requests with invalid tokens set event.app to undefiend.
   */
  enforceAppCheck?: boolean;
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
  retry?: boolean | Expression<boolean> | ResetValue | null;

  /** Region of the EventArc trigger. */
  // region?: string | Expression<string> | null;
  region?: string;

  /** The service account that EventArc should use to invoke this function. Requires the P4SA to have ActAs permission on this service account. */
  serviceAccount?: string | ResetValue | null;

  /** The name of the channel where the function receives events. */
  channel?: string;
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
      endpoint.vpc = null;
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
  convertIfPresent(endpoint, opts, "secretEnvironmentVariables", "secrets", (secrets) =>
    secrets.map((secret) => ({ key: secret }))
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
