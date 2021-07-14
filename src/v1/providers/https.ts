// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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

import * as express from 'express';

import * as common from '../../common/providers/https';
import { HttpsFunction, optionsToTrigger, Runnable } from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

export type Request = common.Request;
export type CallableContext = common.CallableContext;
export type FunctionsErrorCode = common.FunctionsErrorCode;
export type HttpsError = common.HttpsError;

/**
 * Handle HTTP requests.
 * @param handler A function that takes a request and response object,
 * same signature as an Express app.
 */
export function onRequest(
  handler: (req: Request, resp: express.Response) => void | Promise<void>
): HttpsFunction {
  return _onRequestWithOptions(handler, {});
}

/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param handler A method that takes a data and context and returns a value.
 */
export function onCall(
  handler: (data: any, context: CallableContext) => any | Promise<any>
): HttpsFunction & Runnable<any> {
  return _onCallWithOptions(handler, {});
}

/** @hidden */
export function _onRequestWithOptions(
  handler: (req: Request, resp: express.Response) => void | Promise<void>,
  options: DeploymentOptions
): HttpsFunction {
  // lets us add __trigger without altering handler:
  const cloudFunction: any = (req: Request, res: express.Response) => {
    return handler(req, res);
  };
  cloudFunction.__trigger = {
    ...optionsToTrigger(options),
    httpsTrigger: {},
  };
  // TODO parse the options
  return cloudFunction;
}

/** @hidden */
export function _onCallWithOptions(
  handler: (data: any, context: CallableContext) => any | Promise<any>,
  options: DeploymentOptions
): HttpsFunction & Runnable<any> {
  const func: any = common.onCallHandler(
    { origin: true, methods: 'POST' },
    handler
  );

  func.__trigger = {
    labels: {},
    ...optionsToTrigger(options),
    httpsTrigger: {},
  };
  func.__trigger.labels['deployment-callable'] = 'true';

  func.run = handler;

  return func;
}
