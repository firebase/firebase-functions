import { FirebaseAlertData, getEndpointAnnotation } from '.';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/** Generic crashlytics issue interface */
export interface Issue {
  /** The ID of the crashlytics issue */
  id: string;
  /** The title of the crashlytics issue */
  title: string;
  /** The subtitle of the crashlytics issue */
  subtitle: string;
  /** The application version of the crashlytics issue */
  appVersion: string;
}

/**
 * The internal payload object for a new fatal issue.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewFatalIssuePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewFatalIssuePayload';
  /** Basic information of the Crashlytics issue */
  issue: Issue;
}

/**
 * The internal payload object for a new non-fatal issue.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewNonfatalIssuePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewNonfatalIssuePayload';
  /** Basic information of the Crashlytics issue */
  issue: Issue;
}

/**
 * The internal payload object for a regression alert.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface RegressionAlertPayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsRegressionAlertPayload';
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

/** Generic crashlytics trending issue interface */
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
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface StabilityDigestPayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsStabilityDigestPayload';
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
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface VelocityAlertPayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsVelocityAlertPayload';
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
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewAnrIssuePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewAnrIssuePayload';
  /** Basic information of the Crashlytics issue */
  issue: Issue;
}

/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 */
export interface CrashlyticsEvent<T> extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /** The Firebase App ID that’s associated with the alert. */
  appId: string;
}

/** @internal */
export const newFatalIssueAlert = 'crashlytics.newFatalIssue';
/** @internal */
export const newNonfatalIssueAlert = 'crashlytics.newNonfatalIssue';
/** @internal */
export const regressionAlert = 'crashlytics.regression';
/** @internal */
export const stabilityDigestAlert = 'crashlytics.stabilityDigest';
/** @internal */
export const velocityAlert = 'crashlytics.velocity';
/** @internal */
export const newAnrIssueAlert = 'crashlytics.newAnrIssue';

/**
 * Configuration for crashlytics functions.
 */
export interface CrashlyticsOptions extends options.EventHandlerOptions {
  appId?: string;
}

/**
 * Declares a function that can handle a new fatal issue published to crashlytics.
 */
export function onNewFatalIssuePublished(
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  appId: string,
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<NewFatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewFatalIssuePayload>> {
  return onOperation<NewFatalIssuePayload>(
    newFatalIssueAlert,
    appIdOrOptsOrHandler,
    handler
  );
}

/**
 * Declares a function that can handle aa new non-fatal issue published to crashlytics.
 */
export function onNewNonfatalIssuePublished(
  handler: (
    event: CrashlyticsEvent<NewNonfatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  appId: string,
  handler: (
    event: CrashlyticsEvent<NewNonfatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: (
    event: CrashlyticsEvent<NewNonfatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((
        event: CrashlyticsEvent<NewNonfatalIssuePayload>
      ) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<NewNonfatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewNonfatalIssuePayload>> {
  return onOperation<NewNonfatalIssuePayload>(
    newNonfatalIssueAlert,
    appIdOrOptsOrHandler,
    handler
  );
}

/**
 * Declares a function that can handle a regression alert published to crashlytics.
 */
export function onRegressionAlertPublished(
  handler: (
    event: CrashlyticsEvent<RegressionAlertPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  appId: string,
  handler: (
    event: CrashlyticsEvent<RegressionAlertPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  opts: CrashlyticsOptions,
  handler: (
    event: CrashlyticsEvent<RegressionAlertPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<RegressionAlertPayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<RegressionAlertPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<RegressionAlertPayload>> {
  return onOperation<RegressionAlertPayload>(
    regressionAlert,
    appIdOrOptsOrHandler,
    handler
  );
}

/**
 * Declares a function that can handle a stability digest published to crashlytics.
 */
export function onStabilityDigestPublished(
  handler: (
    event: CrashlyticsEvent<StabilityDigestPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  appId: string,
  handler: (
    event: CrashlyticsEvent<StabilityDigestPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  opts: CrashlyticsOptions,
  handler: (
    event: CrashlyticsEvent<StabilityDigestPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<StabilityDigestPayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<StabilityDigestPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<StabilityDigestPayload>> {
  return onOperation<StabilityDigestPayload>(
    stabilityDigestAlert,
    appIdOrOptsOrHandler,
    handler
  );
}

/**
 * Declares a function that can handle a velocity alert published to crashlytics.
 */
export function onVelocityAlertPublished(
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  appId: string,
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<VelocityAlertPayload>
  ) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<VelocityAlertPayload>> {
  return onOperation<VelocityAlertPayload>(
    velocityAlert,
    appIdOrOptsOrHandler,
    handler
  );
}

/**
 * Declares a function that can handle a new Application Not Responding issue published to crashlytics.
 */
export function onNewAnrIssuePublished(
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  appId: string,
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<CrashlyticsEvent<NewAnrIssuePayload>> {
  return onOperation<NewAnrIssuePayload>(
    newAnrIssueAlert,
    appIdOrOptsOrHandler,
    handler
  );
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
  if (typeof appIdOrOptsOrHandler === 'function') {
    handler = appIdOrOptsOrHandler as (
      event: CrashlyticsEvent<T>
    ) => any | Promise<any>;
    appIdOrOptsOrHandler = {};
  }

  const [opts, appId] = getOptsAndApp(
    appIdOrOptsOrHandler as string | CrashlyticsOptions
  );

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as CrashlyticsEvent<T>);
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, alertType, appId);

  return func;
}

/**
 * @internal
 * Helper function to parse the function opts and appId.
 */
export function getOptsAndApp(
  appIdOrOpts: string | CrashlyticsOptions
): [options.EventHandlerOptions, string | undefined] {
  let opts: options.EventHandlerOptions;
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
