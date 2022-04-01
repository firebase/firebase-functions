// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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

import * as options from '../options';
import { CloudEvent, CloudFunction } from '../core';
import { copyIfPresent } from '../../common/encoding';
import { ManifestEndpoint, EventFilter } from '../../runtime/manifest';

/** Options that can be set on an Eventarc trigger. */
export interface EventarcTriggerOptions extends options.EventHandlerOptions {
  /**
   * Type of the event.
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
}

export type CloudEventHandler = (event: CloudEvent<any>) => any | Promise<any>;

/** Handle an Eventarc event published on the default channel. */
export function onCustomEventPublished<T = any>(
  eventType: string,
  handler: CloudEventHandler
): CloudFunction<CloudEvent<T>>;

export function onCustomEventPublished<T = any>(
  opts: EventarcTriggerOptions,
  handler: CloudEventHandler
): CloudFunction<CloudEvent<T>>;

export function onCustomEventPublished<T = any>(
  eventTypeOrOpts: string | EventarcTriggerOptions,
  handler: CloudEventHandler
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
      eventFilters: toEventFilter(opts.filters),
      retry: false,
      channel,
    },
  };
  if (!opts.filters) {
    delete endpoint.eventTrigger.eventFilters;
  }
  copyIfPresent(endpoint.eventTrigger, opts, 'retry', 'retry');

  func.__endpoint = endpoint;

  return func;
}

function toEventFilter(
  filters: Record<string, string> | undefined
): EventFilter[] | undefined {
  if (typeof filters === 'undefined') {
    return undefined;
  }
  const out: EventFilter[] = [];
  for (var k in filters) {
    out.push({
      attribute: k,
      value: filters[k],
    });
  }
  return out;
}
