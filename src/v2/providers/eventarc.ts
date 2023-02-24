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

import { convertIfPresent, copyIfPresent } from "../../common/encoding";
import { ResetValue } from "../../common/options";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import { CloudEvent, CloudFunction } from "../core";
import { wrapTraceContext } from "../trace";
import { Expression } from "../../params";
import * as options from "../options";
import { SecretParam } from "../../params/types";

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
   * If true, do not deploy or emulate this function.
   */
  omit?: boolean | Expression<boolean>;

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string | Expression<string> | ResetValue;

  /**
   * Amount of memory to allocate to a function.
   */
  memory?: options.MemoryOption | Expression<number> | ResetValue;

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
  vpcConnectorEgressSettings?: options.VpcEgressSetting | ResetValue;

  /**
   * Specific service account for the function to run as.
   */
  serviceAccount?: string | ResetValue;

  /**
   * Ingress settings which control where this function can be called from.
   */
  ingressSettings?: options.IngressSetting | ResetValue;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a function.
   */
  secrets?: (string | SecretParam)[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean | Expression<boolean> | ResetValue;
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
  if (typeof eventTypeOrOpts === "string") {
    opts = {
      eventType: eventTypeOrOpts,
    };
  } else if (typeof eventTypeOrOpts === "object") {
    opts = eventTypeOrOpts;
  }
  const func = (raw: CloudEvent<unknown>) => {
    return wrapTraceContext(handler)(raw as CloudEvent<T>);
  };

  func.run = handler;

  const channel = opts.channel ?? "locations/us-central1/channels/firebase";

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);

  const endpoint: ManifestEndpoint = {
    ...initV2Endpoint(options.getGlobalOptions(), opts),
    platform: "gcfv2",
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
  convertIfPresent(endpoint.eventTrigger, opts, "eventFilters", "filters");
  copyIfPresent(endpoint.eventTrigger, opts, "retry");

  func.__endpoint = endpoint;

  func.__requiredAPIs = [
    {
      api: "eventarcpublishing.googleapis.com",
      reason: "Needed for custom event functions",
    },
  ];

  return func;
}
