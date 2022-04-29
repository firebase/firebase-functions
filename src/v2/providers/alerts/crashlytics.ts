import { FirebaseAlertData, getEndpointAnnotation } from '.';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/** Generic crashlytics issue interface */
interface Issue {
  id: string;
  title: string;
  subtitle: string;
  appVersion: string;
}

/**
 * The internal payload object for a new fatal issue.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewFatalIssuePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewFatalIssuePayload';
  issue: Issue;
}

/**
 * The internal payload object for a new non-fatal issue.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewNonfatalIssuePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewNonfatalIssuePayload';
  issue: Issue;
}

/**
 * The internal payload object for a regression alert.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface RegressionAlertPayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsRegressionAlertPayload';
  type: string;
  issue: Issue;
  resolveTime: string;
}

/** Generic crashlytics trending issue interface */
interface TrendingIssueDetails {
  type: string;
  issue: Issue;
  eventCount: number;
  userCount: number;
}

/**
 * The internal payload object for a stability digest.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface StabilityDigestPayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsStabilityDigestPayload';
  digestDate: string;
  trendingIssues: TrendingIssueDetails[];
}

/**
 * The internal payload object for a velocity alert.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface VelocityAlertPayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsVelocityAlertPayload';
  issue: Issue;
  createTime: string;
  crashCount: number;
  crashPercentage: number;
  firstVersion: string;
}

/**
 * The internal payload object for a new Application Not Responding issue.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewAnrIssuePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.CrashlyticsNewAnrIssuePayload';
  issue: Issue;
}

interface WithAlertTypeAndApp {
  alertType: string;
  appId: string;
}
/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 */
export type CrashlyticsEvent<T> = CloudEvent<
  FirebaseAlertData<T>,
  WithAlertTypeAndApp
>;

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
): CloudFunction<FirebaseAlertData<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  appId: string,
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<NewFatalIssuePayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<NewFatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewFatalIssuePayload>> {
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
): CloudFunction<FirebaseAlertData<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  appId: string,
  handler: (
    event: CrashlyticsEvent<NewNonfatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: (
    event: CrashlyticsEvent<NewNonfatalIssuePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewNonfatalIssuePayload>>;
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
): CloudFunction<FirebaseAlertData<NewNonfatalIssuePayload>> {
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
): CloudFunction<FirebaseAlertData<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  appId: string,
  handler: (
    event: CrashlyticsEvent<RegressionAlertPayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  opts: CrashlyticsOptions,
  handler: (
    event: CrashlyticsEvent<RegressionAlertPayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<RegressionAlertPayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<RegressionAlertPayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<RegressionAlertPayload>> {
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
): CloudFunction<FirebaseAlertData<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  appId: string,
  handler: (
    event: CrashlyticsEvent<StabilityDigestPayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  opts: CrashlyticsOptions,
  handler: (
    event: CrashlyticsEvent<StabilityDigestPayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<StabilityDigestPayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<StabilityDigestPayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<StabilityDigestPayload>> {
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
): CloudFunction<FirebaseAlertData<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  appId: string,
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<VelocityAlertPayload>) => any | Promise<any>),
  handler?: (
    event: CrashlyticsEvent<VelocityAlertPayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<VelocityAlertPayload>> {
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
): CloudFunction<FirebaseAlertData<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  appId: string,
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  opts: CrashlyticsOptions,
  handler: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | ((event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>),
  handler?: (event: CrashlyticsEvent<NewAnrIssuePayload>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewAnrIssuePayload>> {
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
): CloudFunction<FirebaseAlertData<T>> {
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
