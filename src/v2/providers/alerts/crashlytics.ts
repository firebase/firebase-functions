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
 * Cloud functions to handle Crashlytics events from Firebase Alerts.
 * @packageDocumentation
 */

import { ResetValue } from "../../../common/options";
import { Expression } from "../../../params";
import { CloudEvent, CloudFunction } from "../../core";
import { wrapTraceContext } from "../../trace";
import { convertAlertAndApp, FirebaseAlertData, getEndpointAnnotation } from "./alerts";
import * as options from "../../options";

/** Generic Crashlytics issue interface */
export interface Issue {
  /** The ID of the Crashlytics issue */
  id: string;
  /** The title of the Crashlytics issue */
  title: string;
  /** The subtitle of the Crashlytics issue */
  subtitle: string;
  /** The application version of the Crashlytics issue */
  appVersion: string;
}

/**
 * The internal payload object for a new fatal issue.
 * Payload is wrapped inside a `FirebaseAlertData` object.
 */
export interface NewFatalIssuePayload {
  ["@type"]: "type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewFatalIssuePayload";
  /** Basic information of the Crashlytics issue */
  issue: Issue;
}

/**
 * The internal payload object for a new non-fatal issue.
 * Payload is wrapped inside a `FirebaseAlertData` object.
 */
export interface NewNonfatalIssuePayload {
  ["@type"]: "type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewNonfatalIssuePayload";
  /** Basic information of the Crashlytics issue */
  issue: Issue;
}

/**
 * The internal payload object for a regression alert.
 * Payload is wrapped inside a `FirebaseAlertData` object.
 */
export interface RegressionAlertPayload {
  ["@type"]: "type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsRegressionAlertPayload";
  /** The type of the Crashlytics issue, e.g. new fatal, new nonfatal, ANR */
  type: string;
  /** Basic information of the Crashlytics issue */
  issue: Issue;
  /**
   * The time that the Crashlytics issues was most recently resolved before it
   * began to reoccur.
   */
  resolveTime: string;
}

/** Generic Crashlytics trending issue interface */
export interface TrendingIssueDetails {
  /** The type of the Crashlytics issue, e.g. new fatal, new nonfatal, ANR */
  type: string;
  /** Basic information of the Crashlytics issue */
  issue: Issue;
  /** The number of crashes that occurred with the issue */
  eventCount: number;
  /** The number of distinct users that were affected by the issue */
  userCount: number;
}

/**
 * The internal payload object for a stability digest.
 * Payload is wrapped inside a `FirebaseAlertData` object.
 */
export interface StabilityDigestPayload {
  ["@type"]: "type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsStabilityDigestPayload";
  /**
   * The date that the digest gets created. Issues in the digest should have the
   * same date as the digest date
   */
  digestDate: string;
  /** A stability digest containing several trending Crashlytics issues */
  trendingIssues: TrendingIssueDetails[];
}

/**
 * The internal payload object for a velocity alert.
 * Payload is wrapped inside a `FirebaseAlertData` object.
 */
export interface VelocityAlertPayload {
  ["@type"]: "type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsVelocityAlertPayload";
  /** Basic information of the Crashlytics issue */
  issue: Issue;
  /** The time that the Crashlytics issue gets created */
  createTime: string;
  /**
   * The number of user sessions for the given app version that had this
   * specific crash issue in the time period used to trigger the velocity alert.
   */
  crashCount: number;
  /**
   * The percentage of user sessions for the given app version that had this
   * specific crash issue in the time period used to trigger the velocity alert.
   */
  crashPercentage: number;
  /**
   * The first app version where this issue was seen, and not necessarily the
   * version that has triggered the alert.
   */
  firstVersion: string;
}

/**
 * The internal payload object for a new Application Not Responding issue.
 * Payload is wrapped inside a `FirebaseAlertData` object.
 */
export interface NewAnrIssuePayload {
  ["@type"]: "type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewAnrIssuePayload";
  /** Basic information of the Crashlytics issue */
  issue: Issue;
}

/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 * @typeParam T - the data type for Crashlytics alerts that is wrapped in a `FirebaseAlertData` object.
 */
export interface CrashlyticsEvent<T> extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /** The Firebase App ID that’s associated with the alert. */
  appId: string;
}

/** @internal */
export const newFatalIssueAlert = "crashlytics.newFatalIssue";
/** @internal */
export const newNonfatalIssueAlert = "crashlytics.newNonfatalIssue";
/** @internal */
export const regressionAlert = "crashlytics.regression";
/** @internal */
export const stabilityDigestAlert = "crashlytics.stabilityDigest";
/** @internal */
export const velocityAlert = "crashlytics.velocity";
/** @internal */
export const newAnrIssueAlert = "crashlytics.newAnrIssue";

/**
 * Configuration for Crashlytics functions.
 */
export interface CrashlyticsOptions extends options.EventHandlerOptions {
  /** Scope the function to trigger on a specific application. */
  appId?: string;

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string;

  /**
   * Amount of memory to allocate to a function.
   * A value of null restores the defaults of 256MB.
   */
  memory?: options.MemoryOption | Expression<number> | ResetValue | null;

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
  vpcConnectorEgressSettings?: options.VpcEgressSetting | ResetValue | null;

  /**
   * Specific service account for the function to run as.
   * A value of null restores the default service account.
   */
  serviceAccount?: string | ResetValue | null;

  /**
   * Ingress settings which control where this function can be called from.
   * A value of null turns off ingress settings.
   */
  ingressSettings?: options.IngressSetting | ResetValue | null;

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

/**
 * Declares a function that can handle a new fatal issue published to Crashlytics.
 * @param handler - Event handler that is triggered when a new fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewFatalIssuePublished(
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>>;

/**
 * Declares a function that can handle a new fatal issue published to Crashlytics.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler that is triggered when a new fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewFatalIssuePublished(
  appId: string,
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>>;

/**
 * Declares a function that can handle a new fatal issue published to Crashlytics.
 * @param opts - Options that can be set on the function.
 * @param handler - Event handler that is triggered when a new fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewFatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>>;

/**
 * Declares a function that can handle a new fatal issue published to Crashlytics.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler that is triggered when a new fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewFatalIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>> {
  return onOperation<NewFatalIssuePayload>(newFatalIssueAlert, appIdOrOptsOrHandler, handler);
}

/**
 * Declares a function that can handle a new non-fatal issue published to Crashlytics.
 * @param handler - Event handler that is triggered when a new fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewNonfatalIssuePublished(
  handler: (event: CrashlyticsEvent<NewNonfatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>>;

/**
 * Declares a function that can handle a new non-fatal issue published to Crashlytics.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler that is triggered when a new non-fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewNonfatalIssuePublished(
  appId: string,
  handler: (event: CrashlyticsEvent<NewNonfatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>>;

/**
 * Declares a function that can handle a new non-fatal issue published to Crashlytics.
 * @param opts - Options that can be set on the function.
 * @param handler - Event handler that is triggered when a new non-fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewNonfatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<NewNonfatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>>;

/**
 * Declares a function that can handle a new non-fatal issue published to Crashlytics.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler that is triggered when a new non-fatal issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewNonfatalIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<NewNonfatalIssuePayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<NewNonfatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>> {
  return onOperation<NewNonfatalIssuePayload>(newNonfatalIssueAlert, appIdOrOptsOrHandler, handler);
}

/**
 * Declares a function that can handle a regression alert published to Crashlytics.
 * @param handler - Event handler that is triggered when a regression alert is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onRegressionAlertPublished(
  handler: (event: CrashlyticsEvent<RegressionAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>>;

/**
 * Declares a function that can handle a regression alert published to Crashlytics.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler that is triggered when a regression alert is published to Crashlytics.
 * @returns A function that you can export and deploy.

 */
export function onRegressionAlertPublished(
  appId: string,
  handler: (event: CrashlyticsEvent<RegressionAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>>;

/**
 * Declares a function that can handle a regression alert published to Crashlytics.
 * @param opts - Options that can be set on the function.
 * @param handler - Event handler that is triggered when a regression alert is published to Crashlytics.
 * @returns A function that you can export and deploy.

 */
export function onRegressionAlertPublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<RegressionAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>>;

/**
 * Declares a function that can handle a regression alert published to Crashlytics.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler that is triggered when a regression alert is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onRegressionAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<RegressionAlertPayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<RegressionAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>> {
  return onOperation<RegressionAlertPayload>(regressionAlert, appIdOrOptsOrHandler, handler);
}

/**
 * Declares a function that can handle a stability digest published to Crashlytics.
 * @param handler - Event handler that is triggered when a stability digest is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onStabilityDigestPublished(
  handler: (event: CrashlyticsEvent<StabilityDigestPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>>;

/**
 * Declares a function that can handle a stability digest published to Crashlytics.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler that is triggered when a stability digest is published to Crashlytics.
 * @returns A function that you can export and deploy.

 */
export function onStabilityDigestPublished(
  appId: string,
  handler: (event: CrashlyticsEvent<StabilityDigestPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>>;

/**
 * Declares a function that can handle a stability digest published to Crashlytics.
 * @param opts - Options that can be set on the function.
 * @param handler - Event handler that is triggered when a stability digest is published to Crashlytics.
 * @returns A function that you can export and deploy.

 */
export function onStabilityDigestPublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<StabilityDigestPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>>;

/**
 * Declares a function that can handle a stability digest published to Crashlytics.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler that is triggered when a stability digest is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onStabilityDigestPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<StabilityDigestPayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<StabilityDigestPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>> {
  return onOperation<StabilityDigestPayload>(stabilityDigestAlert, appIdOrOptsOrHandler, handler);
}

/**
 * Declares a function that can handle a velocity alert published to Crashlytics.
 * @param handler - Event handler that is triggered when a velocity alert is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onVelocityAlertPublished(
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>>;

/**
 * Declares a function that can handle a velocity alert published to Crashlytics.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler that is triggered when a velocity alert is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onVelocityAlertPublished(
  appId: string,
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>>;

/**
 * Declares a function that can handle a velocity alert published to Crashlytics.
 * @param opts - Options that can be set on the function.
 * @param handler - Event handler that is triggered when a velocity alert is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onVelocityAlertPublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>>;

/**
 * Declares a function that can handle a velocity alert published to Crashlytics.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler that is triggered when a velocity alert is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onVelocityAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>> {
  return onOperation<VelocityAlertPayload>(velocityAlert, appIdOrOptsOrHandler, handler);
}

/**
 * Declares a function that can handle a new Application Not Responding issue published to Crashlytics.
 * @param handler - Event handler that is triggered when a new Application Not Responding issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewAnrIssuePublished(
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>>;

/**
 * Declares a function that can handle a new Application Not Responding issue published to Crashlytics.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler that is triggered when a new Application Not Responding issue is published to Crashlytics.
 * @returns A function that you can export and deploy.

 */
export function onNewAnrIssuePublished(
  appId: string,
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>>;

/**
 * Declares a function that can handle a new Application Not Responding issue published to Crashlytics.
 * @param opts - Options that can be set on the function.
 * @param handler - Event handler that is triggered when a new Application Not Responding issue is published to Crashlytics.
 * @returns A function that you can export and deploy.

 */
export function onNewAnrIssuePublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>>;

/**
 * Declares a function that can handle a new Application Not Responding issue published to Crashlytics.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler that is triggered when a new Application Not Responding issue is published to Crashlytics.
 * @returns A function that you can export and deploy.
 */
export function onNewAnrIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>> {
  return onOperation<NewAnrIssuePayload>(newAnrIssueAlert, appIdOrOptsOrHandler, handler);
}

/** @internal */
export function onOperation<T>(
  alertType: string,
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<T>) => any | Promise<any>),
  handler: (event: CrashlyticsEvent<T>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<T>> {
  if (typeof appIdOrOptsOrHandler === "function") {
    handler = appIdOrOptsOrHandler as (event: CrashlyticsEvent<T>) => any | Promise<any>;
    appIdOrOptsOrHandler = {};
  }

  const [opts, appId] = getOptsAndApp(appIdOrOptsOrHandler);

  const func = (raw: CloudEvent<unknown>) => {
    return wrapTraceContext(handler(convertAlertAndApp(raw) as CrashlyticsEvent<T>));
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, alertType, appId);

  return func;
}

/**
 * Helper function to parse the function opts and appId.
 * @internal
 */
export function getOptsAndApp(
  appIdOrOpts: string | CrashlyticsOptions
): [options.EventHandlerOptions, string | undefined] {
  let opts: options.EventHandlerOptions;
  let appId: string | undefined;
  if (typeof appIdOrOpts === "string") {
    opts = {};
    appId = appIdOrOpts;
  } else {
    appId = appIdOrOpts.appId;
    opts = { ...appIdOrOpts };
    delete (opts as any).appId;
  }
  return [opts, appId];
}
