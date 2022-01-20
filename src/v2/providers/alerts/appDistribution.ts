import { defineEndpoint, FirebaseAlertData } from '.';
import { ManifestEndpoint } from '../../../common/manifest';
import { CloudEvent, CloudFunction } from '../../core';
import * as options from '../../options';

/** Data */
export interface NewTesterDevicePayload {
  ['@type']: 'com.google.firebase.firebasealerts.NewTesterDevicePayload';
  testerName: string;
  testerEmail: string;
  testerDeviceModelName: string;
  testerDeviceIdentifier: string;
}

/** @internal */
export const newTesterIosDeviceAlert = 'appDistribution.newTesterIosDevice';

/** Options */
export interface AppDistributionOptions extends options.EventHandlerOptions {
  appId?: string;
}

/** Cloud Event Type */
interface WithAlertTypeAndApp {
  alertType: string;
  appId: string;
}
export type AppDistributionEvent<T> = CloudEvent<
  FirebaseAlertData<T>,
  WithAlertTypeAndApp
>;

/** Handlers */
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

  // TypeScript doesn't recognize defineProperty as adding a property and complains
  // that __endpoint doesn't exist. We can either cast to any and lose all type safety
  // or we can just assign a meaningless value before calling defineProperty.
  func.__trigger = 'silence the transpiler';
  func.__endpoint = {} as ManifestEndpoint;
  defineEndpoint(func, opts, newTesterIosDeviceAlert, appId);

  return func;
}

/** @internal */
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
