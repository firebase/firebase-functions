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
 * Cloud functions to handle Firebase App Distribution events from Firebase Alerts.
 * @packageDocumentation
 */

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
  appId?: string;
}

/**
 * Declares a function that can handle adding a new tester iOS device.
 */
export function onNewTesterIosDevicePublished(
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;
export function onNewTesterIosDevicePublished(
  appId: string,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;
export function onNewTesterIosDevicePublished(
  opts: AppDistributionOptions,
  handler: (
    event: AppDistributionEvent<NewTesterDevicePayload>
  ) => any | Promise<any>
): CloudFunction<AppDistributionEvent<NewTesterDevicePayload>>;
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
