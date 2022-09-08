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
 * Cloud functions to handle Firebase Performance Monitoring events from Firebase Alerts.
 * @packageDocumentation
 */

import { CloudEvent, CloudFunction } from "../../core";
import { EventHandlerOptions } from "../../options";
import { FirebaseAlertData, getEndpointAnnotation } from ".";

/**
 * The internal payload object for a performance threshold alert.
 * Payload is wrapped inside a {@link FirebaseAlertData} object.
 */
export interface ThresholdAlertPayload {
  /* Name of the trace or network request this alert is for (e.g. my_custom_trace, firebase.com/api/123) */
  eventName: string;
  /* The resource type this alert is for (i.e. trace, network request, screen rendering, etc.) */
  eventType: string;
  /* The metric type this alert is for (i.e. success rate, response time, duration, etc.) */
  metricType: string;
  /* The number of events checked for this alert condition */
  numSamples: number;
  /* The threshold value of the alert condition without units (e.g. "75", "2.1") */
  thresholdValue: number;
  /* The unit for the alert threshold (e.g. "percent", "seconds") */
  thresholdUnit: string;
  /* The percentile of the alert condition, can be 0 if percentile is not applicable to the alert condition; range: [0, 100] */
  conditionPercentile: number;
  /* The app version this alert was triggered for, can be empty if the alert is for a network request (because the alert was checked against data from all versions of app) or a web app (where the app is versionless) */
  appVersion: string;
  /* The value that violated the alert condition (e.g. "76.5", "3") */
  violationValue: number;
  /* The unit for the violation value (e.g. "percent", "seconds") */
  violationUnit: string;
  /* The link to Fireconsole to investigate more into this alert */
  investigateUri: string;
}

/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 * @typeParam T - the data type for performance alerts that is wrapped in a `FirebaseAlertData` object.
 */
export interface PerformanceEvent<T> extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /** The Firebase App ID that’s associated with the alert. */
  appId: string;
}

/** @internal */
export const thresholdAlert = 'performance.threshold';

/**
 * Configuration for app distribution functions.
 */
export interface PerformanceOptions extends EventHandlerOptions {
  // Scope the function to trigger on a specific application.
  appId?: string;
}

/**
 * Declares a function that can handle receiving performance threshold alerts.
 * @param handler - Event handler which is run every time a threshold alert is received.
 * @returns A function that you can export and deploy.
 */
export function onThresholdAlertPublished(
  handler: (
    event: PerformanceEvent<ThresholdAlertPayload>
  ) => any | Promise<any>
): CloudFunction<PerformanceEvent<ThresholdAlertPayload>>;

/**
 * Declares a function that can handle receiving performance threshold alerts.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler which is run every time a threshold alert is received.
 * @returns A function that you can export and deploy.
 */
export function onThresholdAlertPublished(
  appId: string,
  handler: (
    event: PerformanceEvent<ThresholdAlertPayload>
  ) => any | Promise<any>
): CloudFunction<PerformanceEvent<ThresholdAlertPayload>>;

/**
 * Declares a function that can handle receiving performance threshold alerts.
 * @param opts - Options that can be set on the function.
 * @param handler - Event handler which is run every time a threshold alert is received.
 * @returns A function that you can export and deploy.
 */
export function onThresholdAlertPublished(
  opts: PerformanceOptions,
  handler: (
    event: PerformanceEvent<ThresholdAlertPayload>
  ) => any | Promise<any>
): CloudFunction<PerformanceEvent<ThresholdAlertPayload>>;

/**
 * Declares a function that can handle receiving performance threshold alerts.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler which is run every time a threshold alert is received.
 * @returns A function that you can export and deploy.
 */
export function onThresholdAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | PerformanceOptions
    | ((event: PerformanceEvent<ThresholdAlertPayload>) => any | Promise<any>),
  handler?: (
    event: PerformanceEvent<ThresholdAlertPayload>
  ) => any | Promise<any>
): CloudFunction<PerformanceEvent<ThresholdAlertPayload>> {
  if (typeof appIdOrOptsOrHandler === 'function') {
    handler = appIdOrOptsOrHandler as (
      event: PerformanceEvent<ThresholdAlertPayload>
    ) => any | Promise<any>;
    appIdOrOptsOrHandler = {};
  }

  const [opts, appId] = getOptsAndApp(appIdOrOptsOrHandler);

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as PerformanceEvent<ThresholdAlertPayload>);
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, thresholdAlert, appId);

  return func;
}

/**
 * Helper function to parse the function opts and appId.
 * @internal
 */
export function getOptsAndApp(
  appIdOrOpts: string | PerformanceOptions
): [EventHandlerOptions, string | undefined] {
  let opts: EventHandlerOptions;
  let appId: string | undefined;
  if (typeof appIdOrOpts === 'string') {
    opts = {};
    appId = appIdOrOpts;
  } else {
    appId = appIdOrOpts.appId;
    opts = { ...appIdOrOpts };
    delete (opts as any).appId;
  }
  return [opts, appId];
}
