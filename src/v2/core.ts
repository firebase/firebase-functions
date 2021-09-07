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

/** @internal */
export interface TriggerAnnotation {
  concurrency?: number;
  minInstances?: number;
  maxInstances?: number;
  availableMemoryMb?: number;
  eventTrigger?: {
    eventType: string;
    resource: string;
    service: string;
  };
  failurePolicy?: { retry: boolean };
  httpsTrigger?: {
    invoker?: string[];
  };
  labels?: { [key: string]: string };
  regions?: string[];
  timeout?: string;
  vpcConnector?: string;
  vpcConnectorEgressSettings?: string;
  serviceAccountEmail?: string;
  ingressSettings?: string;

  // TODO: schedule
}

/**
 * A CloudEvent is a cross-platform format for encoding a serverless event.
 * More information can be found in https://github.com/cloudevents/spec
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

  /**
   * A map of template parameter name to value for subject strings.
   *
   * This map is only available on some event types that allow templates
   * in the subject string, such as Firestore. When listening to a document
   * template "/users/{uid}", an event with subject "/documents/users/1234"
   * would have a params of {"uid": "1234"}.
   *
   * Params are generated inside the firebase-functions SDK and are not
   * part of the CloudEvents spec nor the payload that a Cloud Function
   * actually receives.
   */
  params?: Record<string, string>;
}

/** A handler for CloudEvents. */
export interface CloudFunction<T> {
  (raw: CloudEvent<unknown>): any | Promise<any>;

  __trigger: unknown;

  run(event: CloudEvent<T>): any | Promise<any>;
}
