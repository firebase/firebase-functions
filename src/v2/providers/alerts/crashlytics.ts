import { getEndpointAnnotation, FirebaseAlertData } from '.';
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
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsNewFatalIssuePayload';
  issue: Issue;
}

/**
 * The internal payload object for a new non-fatal issue.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewNonfatalIssuePayload {
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsNewNonfatalIssuePayload';
  issue: Issue;
}

/**
 * The internal payload object for a regression alert.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface RegressionAlertPayload {
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsRegressionAlertPayload';
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
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsStabilityDigestPayload';
  digestDate: string;
  trendingIssues: TrendingIssueDetails[];
}

/**
 * The internal payload object for a velocity alert.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface VelocityAlertPayload {
  ['@type']: 'com.google.firebase.firebasealerts.VelocityAlertPayload';
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
  ['@type']: 'com.google.firebase.firebasealerts.NewAnrIssuePayload';
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

/** @internal */
type CrashlyticsEventHandler<T> = (
  event: CrashlyticsEvent<T>
) => any | Promise<any>;

/**
 * Declares a function that can handle a new fatal issue published to crashlytics.
 */
export function onNewFatalIssuePublished(
  handler: CrashlyticsEventHandler<NewFatalIssuePayload>
): CloudFunction<FirebaseAlertData<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  appId: string,
  handler: CrashlyticsEventHandler<NewFatalIssuePayload>
): CloudFunction<FirebaseAlertData<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: CrashlyticsEventHandler<NewFatalIssuePayload>
): CloudFunction<FirebaseAlertData<NewFatalIssuePayload>>;
export function onNewFatalIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | CrashlyticsEventHandler<NewFatalIssuePayload>,
  handler?: CrashlyticsEventHandler<NewFatalIssuePayload>
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
  handler: CrashlyticsEventHandler<NewNonfatalIssuePayload>
): CloudFunction<FirebaseAlertData<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  appId: string,
  handler: CrashlyticsEventHandler<NewNonfatalIssuePayload>
): CloudFunction<FirebaseAlertData<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  opts: CrashlyticsOptions,
  handler: CrashlyticsEventHandler<NewNonfatalIssuePayload>
): CloudFunction<FirebaseAlertData<NewNonfatalIssuePayload>>;
export function onNewNonfatalIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | CrashlyticsEventHandler<NewNonfatalIssuePayload>,
  handler?: CrashlyticsEventHandler<NewNonfatalIssuePayload>
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
  handler: CrashlyticsEventHandler<RegressionAlertPayload>
): CloudFunction<FirebaseAlertData<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  appId: string,
  handler: CrashlyticsEventHandler<RegressionAlertPayload>
): CloudFunction<FirebaseAlertData<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  opts: CrashlyticsOptions,
  handler: CrashlyticsEventHandler<RegressionAlertPayload>
): CloudFunction<FirebaseAlertData<RegressionAlertPayload>>;
export function onRegressionAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | CrashlyticsEventHandler<RegressionAlertPayload>,
  handler?: CrashlyticsEventHandler<RegressionAlertPayload>
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
  handler: CrashlyticsEventHandler<StabilityDigestPayload>
): CloudFunction<FirebaseAlertData<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  appId: string,
  handler: CrashlyticsEventHandler<StabilityDigestPayload>
): CloudFunction<FirebaseAlertData<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  opts: CrashlyticsOptions,
  handler: CrashlyticsEventHandler<StabilityDigestPayload>
): CloudFunction<FirebaseAlertData<StabilityDigestPayload>>;
export function onStabilityDigestPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | CrashlyticsEventHandler<StabilityDigestPayload>,
  handler?: CrashlyticsEventHandler<StabilityDigestPayload>
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
  handler: CrashlyticsEventHandler<VelocityAlertPayload>
): CloudFunction<FirebaseAlertData<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  appId: string,
  handler: CrashlyticsEventHandler<VelocityAlertPayload>
): CloudFunction<FirebaseAlertData<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  opts: CrashlyticsOptions,
  handler: CrashlyticsEventHandler<VelocityAlertPayload>
): CloudFunction<FirebaseAlertData<VelocityAlertPayload>>;
export function onVelocityAlertPublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | CrashlyticsEventHandler<VelocityAlertPayload>,
  handler?: CrashlyticsEventHandler<VelocityAlertPayload>
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
  handler: CrashlyticsEventHandler<NewAnrIssuePayload>
): CloudFunction<FirebaseAlertData<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  appId: string,
  handler: CrashlyticsEventHandler<NewAnrIssuePayload>
): CloudFunction<FirebaseAlertData<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  opts: CrashlyticsOptions,
  handler: CrashlyticsEventHandler<NewAnrIssuePayload>
): CloudFunction<FirebaseAlertData<NewAnrIssuePayload>>;
export function onNewAnrIssuePublished(
  appIdOrOptsOrHandler:
    | string
    | CrashlyticsOptions
    | CrashlyticsEventHandler<NewAnrIssuePayload>,
  handler?: CrashlyticsEventHandler<NewAnrIssuePayload>
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
    | CrashlyticsEventHandler<T>,
  handler: CrashlyticsEventHandler<T>
): CloudFunction<FirebaseAlertData<T>> {
  if (typeof appIdOrOptsOrHandler === 'function') {
    handler = appIdOrOptsOrHandler as CrashlyticsEventHandler<T>;
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
