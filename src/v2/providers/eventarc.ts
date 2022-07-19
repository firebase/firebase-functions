// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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
 * Cloud functions to integrate directly with Eventarc.
 * @packageDocumentation
 */

import { convertIfPresent, copyIfPresent } from '../../common/encoding';
import { ManifestEndpoint } from '../../runtime/manifest';
import { CloudEvent, CloudFunction } from '../core';
import * as options from '../options';
import { Expression, Field } from '../expressions';

/** Options that can be set on an Eventarc trigger. */
export interface EventarcTriggerOptions extends options.EventHandlerOptions {
  /**
   * Type of the event to trigger on.
   */
  eventType: string;

  /**
   * ID of the channel. Can be either:
   *   * fully qualified channel resource name:
   *     `projects/{project}/locations/{location}/channels/{channel-id}`
   *   * partial resource name with location and channel ID, in which case
   *     the runtime project ID of the function will be used:
   *     `locations/{location}/channels/{channel-id}`
   *   * partial channel ID, in which case the runtime project ID of the
   *     function and `us-central1` as location will be used:
   *     `{channel-id}`
   *
   * If not specified, the default Firebase channel will be used:
   * `projects/{project}/locations/us-central1/channels/firebase`
   */
  channel?: string;

  /**
   * Eventarc event exact match filter.
   */
  filters?: Record<string, string>;

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string;

  /**
   * Amount of memory to allocate to a function.
   * A value of null restores the defaults of 256MB.
   */
  memory?: options.MemoryOption | Expression<number> | null;

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
  timeoutSeconds?: Field<number>;

  /**
   * Min number of actual instances to be running at a given time.
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   * A value of null restores the default min instances.
   */
  minInstances?: Field<number>;

  /**
   * Max number of instances to be running in parallel.
   * A value of null restores the default max instances.
   */
  maxInstances?: Field<number>;

  /**
   * Number of requests a function can serve at once.
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: Field<number>;

  /**
   * Fractional number of CPUs to allocate to a function.
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
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
  vpcConnectorEgressSettings?: options.VpcEgressSetting | null;

  /**
   * Specific service account for the function to run as.
   * A value of null restores the default service account.
   */
  serviceAccount?: string | null;

  /**
   * Ingress settings which control where this function can be called from.
   * A value of null turns off ingress settings.
   */
  ingressSettings?: options.IngressSetting | null;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a function.
   */
  secrets?: string[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean;
}

/** Handles an Eventarc event published on the default channel.
 * @param eventType - Type of the event to trigger on.
 * @param handler - A function to execute when triggered.
 * @returns A function that you can export and deploy.
 */
export function onCustomEventPublished<T = any>(
  eventType: string,
  handler: (event: CloudEvent<T>) => any | Promise<any>
): CloudFunction<CloudEvent<T>>;

/** Handles an Eventarc event.
 * @param opts - Options to set on this function
 * @param handler - A function to execute when triggered.
 * @returns A function that you can export and deploy.
 */
export function onCustomEventPublished<T = any>(
  opts: EventarcTriggerOptions,
  handler: (event: CloudEvent<T>) => any | Promise<any>
): CloudFunction<CloudEvent<T>>;

export function onCustomEventPublished<T = any>(
  eventTypeOrOpts: string | EventarcTriggerOptions,
  handler: (event: CloudEvent<T>) => any | Promise<any>
): CloudFunction<CloudEvent<T>> {
  let opts: EventarcTriggerOptions;
  if (typeof eventTypeOrOpts === 'string') {
    opts = {
      eventType: eventTypeOrOpts as string,
    };
  } else if (typeof eventTypeOrOpts === 'object') {
    opts = eventTypeOrOpts as EventarcTriggerOptions;
  }
  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as CloudEvent<T>);
  };

  func.run = handler;

  const channel = opts.channel ?? 'locations/us-central1/channels/firebase';

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);

  const endpoint: ManifestEndpoint = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType: opts.eventType,
      eventFilters: {},
      retry: false,
      channel,
    },
  };
  convertIfPresent(endpoint.eventTrigger, opts, 'eventFilters', 'filters');
  copyIfPresent(endpoint.eventTrigger, opts, 'retry');

  func.__endpoint = endpoint;

  return func;
}
