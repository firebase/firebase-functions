import { ManifestEndpoint } from '../../../runtime/manifest';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/**
 * The CloudEvent data emitted by Firebase Alerts.
 * @typeParam T - the payload type that is expected for this alert.
 */
export interface FirebaseAlertData<T = any> {
  /** Time that the event has created. */
  createTime: string;
  /** Time that the event has ended. Optional, only present for ongoing alerts. */
  endTime: string;
  /** Payload of the event, which includes the details of the specific alert. */
  payload: T;
}

/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 * @typeParam T - the data type for this alert that is wrapped in a `FirebaseAlertData` object.
 */
export interface AlertEvent<T> extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /**
   * The Firebase App ID that’s associated with the alert. This is optional,
   * and only present when the alert is targeting at a specific Firebase App.
   */
  appId?: string;

  /** Data for an `AlertEvent` is a `FirebaseAlertData` object with a given payload. */
  data: FirebaseAlertData<T>;
}

/** @internal */
export const eventType = 'google.firebase.firebasealerts.alerts.v1.published';

/** The underlying alert type of the Firebase Alerts provider. */
export type AlertType =
  | 'crashlytics.newFatalIssue'
  | 'crashlytics.newNonfatalIssue'
  | 'crashlytics.regression'
  | 'crashlytics.stabilityDigest'
  | 'crashlytics.velocity'
  | 'crashlytics.newAnrIssue'
  | 'billing.planUpdate'
  | 'billing.automatedPlanUpdate'
  | 'appDistribution.newTesterIosDevice'
  | string;

/**
 * Configuration for Firebase Alert functions.
 */
export interface FirebaseAlertOptions extends options.EventHandlerOptions {
  /** Scope the handler to trigger on an alert type. */
  alertType: AlertType;
  /** Scope the function to trigger on a specific application. */
  appId?: string;
}

/**
 * Declares a function that can handle Firebase Alerts from CloudEvents.
 * @typeParam T - The data type of the `FirebaseAlertData` object the function receives.
 * @param alertTypeOrOpts the alert type or Firebase Alert function configuration.
 * @param handler a function that can handle the Firebase Alert inside a CloudEvent.
 * @returns A function that you can export and deploy.
 */
export function onAlertPublished<T extends { ['@type']: string } = any>(
  alertTypeOrOpts: AlertType | FirebaseAlertOptions,
  handler: (event: AlertEvent<T>) => any | Promise<any>
): CloudFunction<AlertEvent<T>> {
  const [opts, alertType, appId] = getOptsAndAlertTypeAndApp(alertTypeOrOpts);

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as AlertEvent<T>);
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, alertType, appId);

  return func;
}

/**
 * Helper function for getting the endpoint annotation used in alert handling functions.
 * @internal
 */
export function getEndpointAnnotation(
  opts: options.EventHandlerOptions,
  alertType: string,
  appId?: string
): ManifestEndpoint {
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
      eventFilters: {
        alerttype: alertType,
      },
      retry: !!opts.retry,
    },
  };
  if (appId) {
    endpoint.eventTrigger.eventFilters.appid = appId;
  }
  return endpoint;
}

/**
 * Helper function to parse the function opts, alert type, and appId.
 * @internal
 */
export function getOptsAndAlertTypeAndApp(
  alertTypeOrOpts: AlertType | FirebaseAlertOptions
): [options.EventHandlerOptions, string, string | undefined] {
  let opts: options.EventHandlerOptions;
  let alertType: AlertType;
  let appId: string | undefined;
  if (typeof alertTypeOrOpts === 'string') {
    alertType = alertTypeOrOpts;
    opts = {};
  } else {
    alertType = alertTypeOrOpts.alertType;
    appId = alertTypeOrOpts.appId;
    opts = { ...alertTypeOrOpts };
    delete (opts as any).alertType;
    delete (opts as any).appId;
  }
  return [opts, alertType, appId];
}
