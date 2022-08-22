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
 * Core functionality of the Firebase Functions v2 SDK.
 * @packageDocumentation
 */

import { Change } from '../common/change';
import { ManifestEndpoint } from '../runtime/manifest';

export { Change };

/**
 * A CloudEventBase is the base of a cross-platform format for encoding a serverless event.
 * More information can be found in https://github.com/cloudevents/spec
 * @typeParam T - The type of the event data.
 * @beta
 */
export interface CloudEvent<T> {
  /** Version of the CloudEvents spec for this event. */
  readonly specversion: '1.0';

  /** A globally unique ID for this event. */
  id: string;

  /** The resource which published this event. */
  source: string;

  /** The resource, provided by source, that this event relates to */
  subject?: string;

  /** The type of event that this represents. */
  type: string;

  /** When this event occurred. */
  time: string;

  /** Information about this specific event. */
  data: T;
}

/**
 * A handler for CloudEvents.
 * @typeParam EventType - The kind of event this function handles.
 *            Always a subclass of CloudEvent<>
 * @beta
 */
export interface CloudFunction<EventType extends CloudEvent<unknown>> {
  (raw: CloudEvent<unknown>): any | Promise<any>;

  /** @alpha */
  __endpoint: ManifestEndpoint;

  /**
   * The callback passed to the CloudFunction constructor.
   * Use run to test a CloudFunction
   * @param event - The parsed event to handle.
   * @returns Any return value. Google Cloud Functions awaits any promise
   *          before shutting down your function. Resolved return values
   *          are only used for unit testing purposes.
   * @beta
   */
  run(event: EventType): any | Promise<any>;
}
