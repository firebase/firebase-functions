import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';
import { FirebaseAlertData, getEndpointAnnotation } from './alerts';

/**
 * The internal payload object for adding a new tester device to app distribution.
 * Payload is wrapped inside a FirebaseAlertData object.
 */
export interface NewTesterDevicePayload {
  ['@type']: 'type.googleapis.com/google.events.firebase.firebasealerts.v1.AppDistroNewTesterIosDevicePayload';
  testerName: string;
  testerEmail: string;
  testerDeviceModelName: string;
  testerDeviceIdentifier: string;
}

interface WithAlertTypeAndApp {
  /** The type of the alerts that got triggered. */
  alertType: string;
  /** The Firebase App ID that’s associated with the alert. */
  appId: string;
}
/**
 * A custom CloudEvent for Firebase Alerts (with custom extension attributes).
 */
export type AppDistributionEvent<T> = CloudEvent<
  FirebaseAlertData<T>,
  WithAlertTypeAndApp
>;

/** @internal */
export const newTesterIosDeviceAlert = 'appDistribution.newTesterIosDevice';

/**
 * Configuration for app distribution functions.
 */
export interface AppDistributionOptions extends options.EventHandlerOptions {
  appId?: string;
}

/**
 * Declares a function that can handle adding a new tester iOS device.
 */
export function onNewTesterIosDevicePublished(
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewTesterDevicePayload>>;
export function onNewTesterIosDevicePublished(
  appId: string,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewTesterDevicePayload>>;
export function onNewTesterIosDevicePublished(
  opts: AppDistributionOptions,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<FirebaseAlertData<NewTesterDevicePayload>>;
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
): CloudFunction<FirebaseAlertData<NewTesterDevicePayload>> {
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
 * @internal
 * Helper function to parse the function opts and appId.
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
