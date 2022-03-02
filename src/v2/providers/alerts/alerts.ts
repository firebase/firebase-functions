import { ManifestEndpoint } from '../../../runtime/manifest';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/**
 * The CloudEvent data emitted by Firebase Alerts.
 */
export interface FirebaseAlertData<T = any> {
  createTime: string;
  endTime: string;
  payload: T;
}

interface WithAlertTypeAndApp {
  alertType: string;
  appId?: string;
}
/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 */
export type AlertEvent<T> = CloudEvent<
  FirebaseAlertData<T>,
  WithAlertTypeAndApp
>;

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
  alertType: AlertType;
  appId?: string;
}

/**
 * Declares a function that can handle Firebase Alerts from CloudEvents.
 * @param alertTypeOrOpts the alert type or Firebase Alert function configuration.
 * @param handler a function that can handle the Firebase Alert inside a CloudEvent.
 */
export function onAlertPublished<T extends { ['@type']: string } = any>(
  alertTypeOrOpts: AlertType | FirebaseAlertOptions,
  handler: (event: AlertEvent<T>) => any | Promise<any>
): CloudFunction<FirebaseAlertData<T>> {
  const [opts, alertType, appId] = getOptsAndAlertTypeAndApp(alertTypeOrOpts);

  const func = (raw: CloudEvent<unknown>) => {
    return handler(
      raw as CloudEvent<FirebaseAlertData<T>, WithAlertTypeAndApp>
    );
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, alertType, appId);

  return func;
}

/**
 * @internal
 * Helper function for getting the endpoint annotation used in alert handling functions.
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
      eventFilters: [
        {
          attribute: 'alertType',
          value: alertType,
        },
      ],
      retry: !!opts.retry,
    },
  };
  if (appId) {
    endpoint.eventTrigger.eventFilters.push({
      attribute: 'appId',
      value: appId,
    });
  }
  return endpoint;
}

/**
 * @internal
 * Helper function to parse the function opts, alert type, and appId.
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
