import { defineEndpoint, FirebaseAlertData } from '.';
import { ManifestEndpoint } from '../../../common/manifest';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/** Data */
interface Issue {
  id: string;
  title: string;
  subtitle: string;
  appVersion: string;
}
// crashlytics.newFatalIssue
export interface NewFatalIssuePayload {
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsNewFatalIssuePayload';
  issue: Issue;
}
// crashlytics.newNonfatalIssue
export interface NewNonfatalIssuePayload {
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsNewNonfatalIssuePayload';
  issue: Issue;
}
// crashlytics.regression
export interface RegressionAlertPayload {
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsRegressionAlertPayload';
  type: string;
  issue: Issue;
  resolveTime: string;
}
// crashlytics.stabilityDigest
interface TrendingIssueDetails {
  type: string;
  issue: Issue;
  eventCount: number;
  userCount: number;
}
export interface StabilityDigestPayload {
  ['@type']: 'com.google.firebase.firebasealerts.CrashlyticsStabilityDigestPayload';
  digestDate: string;
  trendingIssues: TrendingIssueDetails[];
}
// crashlytics.velocity
export interface VelocityAlertPayload {
  ['@type']: 'com.google.firebase.firebasealerts.VelocityAlertPayload';
  issue: Issue;
  createTime: string;
  crashCount: number;
  crashPercentage: number;
  firstVersion: string;
}
// crashlytics.newAnrIssue
export interface NewAnrIssuePayload {
  ['@type']: 'com.google.firebase.firebasealerts.NewAnrIssuePayload';
  issue: Issue;
}

/** Events */
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

/** Options */
export interface CrashlyticsOptions extends options.EventHandlerOptions {
  appId?: string;
}

/** Cloud Event Type */
// appId will always be defined in Crashlytics events
interface WithAlertTypeAndApp {
  alertType: string; // required in the payload
  appId: string; // required in the payload
}
export type CrashlyticsEvent<T> = CloudEvent<
  FirebaseAlertData<T>,
  WithAlertTypeAndApp
>;

/** Handlers */
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

  // TypeScript doesn't recognize defineProperty as adding a property and complains
  // that __endpoint doesn't exist. We can either cast to any and lose all type safety
  // or we can just assign a meaningless value before calling defineProperty.
  func.__trigger = 'silence the transpiler';
  func.__endpoint = {} as ManifestEndpoint;
  defineEndpoint(func, opts, alertType, appId);

  return func;
}

/** @internal */
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
