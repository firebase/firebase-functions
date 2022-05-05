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

import {
  convertIfPresent,
  copyIfPresent,
  durationFromSeconds,
  serviceAccountFromShorthand,
} from '../common/encoding';
import * as logger from '../logger';
import { ManifestEndpoint } from '../runtime/manifest';
import { TriggerAnnotation } from './core';
import { declaredParams } from './params';
import { ParamSpec } from './params/types';
import { HttpsOptions } from './providers/https';

/**
 * List of all regions supported by Cloud Functions v2
 */
export const SUPPORTED_REGIONS = [
  'asia-northeast1',
  'europe-north1',
  'europe-west1',
  'europe-west4',
  'us-central1',
  'us-east1',
  'us-west1',
] as const;

/**
 * A region known to be supported by CloudFunctions v2
 */
export type SupportedRegion = typeof SUPPORTED_REGIONS[number];

/**
 * Cloud Functions v2 min timeout value.
 */
export const MIN_TIMEOUT_SECONDS = 1;

/**
 * Cloud Functions v2 max timeout value for event handlers.
 */
export const MAX_EVENT_TIMEOUT_SECONDS = 540;

/**
 * Cloud Functions v2 max timeout for HTTPS functions.
 */
export const MAX_HTTPS_TIMEOUT_SECONDS = 36_000;

/**
 * Maximum number of requests to serve on a single instance.
 */
export const MAX_CONCURRENCY = 1_000;

/**
 * List of available memory options supported by Cloud Functions.
 */
export const SUPPORTED_MEMORY_OPTIONS = [
  '128MiB',
  '256MiB',
  '512MiB',
  '1GiB',
  '2GiB',
  '4GiB',
  '8GiB',
  '16GiB',
  '32GiB',
] as const;

const MemoryOptionToMB: Record<MemoryOption, number> = {
  '128MiB': 128,
  '256MiB': 256,
  '512MiB': 512,
  '1GiB': 1024,
  '2GiB': 2048,
  '4GiB': 4096,
  '8GiB': 8192,
  '16GiB': 16384,
  '32GiB': 32768,
};

/**
 * A supported memory option.
 */
export type MemoryOption = typeof SUPPORTED_MEMORY_OPTIONS[number];

/**
 * List of available options for VpcConnectorEgressSettings.
 */
export const SUPPORTED_VPC_EGRESS_SETTINGS = [
  'PRIVATE_RANGES_ONLY',
  'ALL_TRAFFIC',
] as const;

/**
 * A valid VPC Egress setting.
 */
export type VpcEgressSetting = typeof SUPPORTED_VPC_EGRESS_SETTINGS[number];

/**
 * List of available options for IngressSettings.
 */
export const SUPPORTED_INGRESS_SETTINGS = [
  'ALLOW_ALL',
  'ALLOW_INTERNAL_ONLY',
  'ALLOW_INTERNAL_AND_GCLB',
] as const;

export type IngressSetting = typeof SUPPORTED_INGRESS_SETTINGS[number];

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
  memory?: MemoryOption | null;

  /**
   * Timeout for the function in sections, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   * A value of null restores the default of 60s
   */
  timeoutSeconds?: number | null;

  /**
   * Min number of actual instances to be running at a given time.
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   * A value of null restores the default min instances.
   */
  minInstances?: number | null;

  /**
   * Max number of instances to be running in parallel.
   * A value of null restores the default max instances.
   */
  maxInstances?: number | null;

  /**
   * Number of requests a function can serve at once.
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU \>= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   */
  concurrency?: number | null;

  /**
   * Fractional number of CPUs to allocate to a function.
   * Defaults to 1 for functions with \<= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | 'gcf_gen1';

  /**
   * Connect cloud function to specified VPC connector.
   * A value of null removes the VPC connector
   */
  vpcConnector?: string | null;

  /**
   * Egress settings for VPC connector.
   * A value of null turns off VPC connector egress settings
   */
  vpcConnectorEgressSettings?: VpcEgressSetting | null;

  /**
   * Specific service account for the function to run as.
   * A value of null restores the default service account.
   */
  serviceAccount?: string | null;

  /**
   * Ingress settings which control where this function can be called from.
   * A value of null turns off ingress settings.
   */
  ingressSettings?: IngressSetting | null;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /**
   * Invoker to set access control on https functions.
   */
  invoker?: 'public' | 'private' | string | string[];

  /*
   * Secrets to bind to a functions.
   */
  secrets?: string[];
}

let globalOptions: GlobalOptions | undefined;

/**
 * Sets default options for all functions written using the v2 SDK.
 * @param options - Options to set as default
 */
export function setGlobalOptions(options: GlobalOptions) {
  if (globalOptions) {
    logger.warn('Calling setGlobalOptions twice leads to undefined behavior');
  }
  globalOptions = options;
}

/**
 * Get the currently set default options.
 * Used only for trigger generation.
 *
 * @internal
 */
export function getGlobalOptions(): GlobalOptions {
  return globalOptions || {};
}

/**
 * Options that can be set on an individual event-handling Cloud Function.
 */
export interface EventHandlerOptions extends GlobalOptions {
  retry?: boolean;
}

/**
 * Apply GlobalOptions to trigger definitions.
 *
 * @internal
 */
export function optionsToTriggerAnnotations(
  opts: GlobalOptions | EventHandlerOptions | HttpsOptions
): TriggerAnnotation {
  const annotation: TriggerAnnotation = {};
  copyIfPresent(
    annotation,
    opts,
    'concurrency',
    'minInstances',
    'maxInstances',
    'ingressSettings',
    'labels',
    'vpcConnector',
    'vpcConnectorEgressSettings',
    'secrets'
  );
  convertIfPresent(
    annotation,
    opts,
    'availableMemoryMb',
    'memory',
    (mem: MemoryOption) => {
      return MemoryOptionToMB[mem];
    }
  );
  convertIfPresent(annotation, opts, 'regions', 'region', (region) => {
    if (typeof region === 'string') {
      return [region];
    }
    return region;
  });
  convertIfPresent(
    annotation,
    opts,
    'serviceAccountEmail',
    'serviceAccount',
    serviceAccountFromShorthand
  );
  convertIfPresent(
    annotation,
    opts,
    'timeout',
    'timeoutSeconds',
    durationFromSeconds
  );
  convertIfPresent(
    annotation,
    (opts as any) as EventHandlerOptions,
    'failurePolicy',
    'retry',
    (retry: boolean) => {
      return retry ? { retry: true } : null;
    }
  );

  return annotation;
}

/**
 * Apply GlobalOptions to endpoint manifest.
 *
 * @internal
 */
export function optionsToEndpoint(
  opts: GlobalOptions | EventHandlerOptions | HttpsOptions
): ManifestEndpoint {
  const endpoint: ManifestEndpoint = {};
  copyIfPresent(
    endpoint,
    opts,
    'concurrency',
    'minInstances',
    'maxInstances',
    'ingressSettings',
    'labels',
    'timeoutSeconds',
    'cpu'
  );
  convertIfPresent(endpoint, opts, 'serviceAccountEmail', 'serviceAccount');
  if (opts.vpcConnector) {
    const vpc: ManifestEndpoint['vpc'] = { connector: opts.vpcConnector };
    convertIfPresent(vpc, opts, 'egressSettings', 'vpcConnectorEgressSettings');
    endpoint.vpc = vpc;
  }
  convertIfPresent(endpoint, opts, 'availableMemoryMb', 'memory', (mem) => {
    return MemoryOptionToMB[mem];
  });
  convertIfPresent(endpoint, opts, 'region', 'region', (region) => {
    if (typeof region === 'string') {
      return [region];
    }
    return region;
  });
  convertIfPresent(
    endpoint,
    opts,
    'secretEnvironmentVariables',
    'secrets',
    (secrets) => secrets.map((secret) => ({ key: secret }))
  );

  return endpoint;
}

/* @internal */
export function __getSpec(): {
  globalOptions: GlobalOptions;
  params: ParamSpec[];
} {
  return {
    globalOptions: getGlobalOptions(),
    params: declaredParams.map((p) => p.toSpec()),
  };
}
