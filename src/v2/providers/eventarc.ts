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
import { ManifestEndpoint } from '../../runtime/manifest';

/** Options that can be set on an eventarc trigger. */
export interface EventarcTriggerOptions extends options.EventHandlerOptions {
  /**
   * ID of the channel. Can be either:
   *   * fully qualified channel resource name:
   *     `projects/{project}/locations/{location}/channels/{channel-id}`
   *   * partial resource name with location and channel id, in which case
   *     the runtime project ID of the function will be used:
   *     `locations/{location}/channels/{channel-id}`
   *   * partial channel-id, in which case the runtime project ID of the
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
  eventType: string,
  opts: EventarcTriggerOptions,
  handler: CloudEventHandler
): CloudFunction<CloudEvent<T>>;

export function onCustomEventPublished<T = any>(
  eventType: string,
  optsOrHandler:
    CloudEventHandler
    | EventarcTriggerOptions,
  handler?: CloudEventHandler,
): CloudFunction<CloudEvent<T>> {
  if (arguments.length < 2) {
    throw new Error(
      'Missing required parameters.'
    );  
  }
  if (arguments.length == 2) {
    if (typeof optsOrHandler !== 'function') { 
      throw new Error(
        'Expected second parameter to be the event handler function.'
      );
    }
    handler = optsOrHandler as CloudEventHandler;
    optsOrHandler = {} as EventarcTriggerOptions;
  } else if (arguments.length == 3) {
    optsOrHandler = optsOrHandler as EventarcTriggerOptions;
  }

  const opts = optsOrHandler as EventarcTriggerOptions;
  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as CloudEvent<T>);
  };

  func.run = handler;

  const channel = opts.channel ?? 'locations/us-central1/channels/firebase';

  Object.defineProperty(func, '__trigger', {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(
        options.getGlobalOptions()
      );
      const specificOpts = options.optionsToTriggerAnnotations(opts);
      const trigger = {
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
        },
        eventTrigger: {
          eventType,
          filters: opts.filters,
          channel,
        },
      };
      if (!opts.filters) {
        delete trigger.eventTrigger.filters;
      }

      return trigger;
    },
  });

  // TypeScript doesn't recognize defineProperty as adding a property and complains
  // that __endpoint doesn't exist. We can either cast to any and lose all type safety
  // or we can just assign a meaningless value before calling defineProperty.
  func.__endpoint = {} as ManifestEndpoint;

  // SDK may attempt to read FIREBASE_CONFIG env var to fetch the default bucket name.
  // To prevent runtime errors when FIREBASE_CONFIG env var is missing, we use getters.
  Object.defineProperty(func, '__endpoint', {
    get: () => {
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
          eventType,
          eventFilters: opts.filters,
          retry: false,
          channel,
        },
      };
      if (!opts.filters) {
        delete endpoint.eventTrigger.eventFilters;
      }
      copyIfPresent(endpoint.eventTrigger, opts, 'retry', 'retry');
      return endpoint;
    },
  });

  return func;
}
