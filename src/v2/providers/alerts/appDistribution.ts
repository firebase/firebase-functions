import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';
import { FirebaseAlertData, getEndpointAnnotation } from './alerts';

/**
 * The internal payload object for adding a new tester device to app distribution.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewTesterDevicePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.AppDistroNewTesterIosDevicePayload';
  /** Name of the tester */
  testerName: string;
  /** Email of the tester */
  testerEmail: string;
  /** The device model name */
  testerDeviceModelName: string;
  /** The device ID */
  testerDeviceIdentifier: string;
}

/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 * @typeParam T - the data type for app distribution alerts that is wrapped in a FirebaseAlertData object.
 */
export interface AppDistributionEvent<T>
  extends CloudEvent<FirebaseAlertData<T>> {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /** The Firebase App ID that’s associated with the alert. */
  appId: string;
}

/** @internal */
export const newTesterIosDeviceAlert = 'appDistribution.newTesterIosDevice';

/**
 * Configuration for app distribution functions.
 */
export interface AppDistributionOptions extends options.EventHandlerOptions {
  /** Scope the function to trigger on a specific application. */
  appId?: string;
}

/**
 * Declares a function that can handle adding a new tester iOS device.
 * @param handler - Event handler which is run every time a new tester iOS devices is added.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onNewTesterIosDevicePublished(
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;

/**
 * Declares a function that can handle adding a new tester iOS device.
 * @param appId - A specific application the handler will trigger on.
 * @param handler - Event handler which is run every time a new tester iOS devices is added.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onNewTesterIosDevicePublished(
  appId: string,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;

/**
 * Declares a function that can handle adding a new tester iOS device.
 * @param opts - Options that can be set on the Cloud Function.
 * @param handler - Event handler which is run every time a new tester iOS devices is added.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onNewTesterIosDevicePublished(
  opts: AppDistributionOptions,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;

/**
 * Declares a function that can handle adding a new tester iOS device.
 * @param appIdOrOptsOrHandler - A specific application, options, or an event-handling function.
 * @param handler - Event handler which is run every time a new tester iOS devices is added.
 * @returns A Cloud Function that you can export and deploy.
 */
export function onNewTesterIosDevicePublished(
  appIdOrOptsOrHandler:
    | string
    | AppDistributionOptions
    | ((
        event: AppDistributionEvent<NewTesterDevicePayload>
      ) => any | Promise<any>),
  handler?: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>> {
  if (typeof appIdOrOptsOrHandler === 'function') {
    handler = appIdOrOptsOrHandler as (
      event: AppDistributionEvent<NewTesterDevicePayload>
    ) => any | Promise<any>;
    appIdOrOptsOrHandler = {};
  }

  const [opts, appId] = getOptsAndApp(appIdOrOptsOrHandler);

  const func = (raw: CloudEvent<unknown>) => {
    return handler(raw as AppDistributionEvent<NewTesterDevicePayload>);
  };

  func.run = handler;
  func.__endpoint = getEndpointAnnotation(opts, newTesterIosDeviceAlert, appId);

  return func;
}

/**
 * Helper function to parse the function opts and appId.
 * @internal
 */
export function getOptsAndApp(
  appIdOrOpts: string | AppDistributionOptions
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
