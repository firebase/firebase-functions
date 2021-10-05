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

import { HttpsFunction, optionsToTrigger, Runnable } from '../cloud-functions';
import { convertIfPresent, convertInvoker } from '../common/encoding';
import {
  CallableContext,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  Request,
} from '../common/providers/https';
import { DeploymentOptions } from '../function-configuration';

export { Request, CallableContext, FunctionsErrorCode, HttpsError };

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

export interface CallableV1Options {
  cors?: string | boolean | RegExp | Array<string | RegExp>;
  allowInvalidAppCheckToken?: boolean;
}

/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param opts Configuration options for the callable function.
 * @param handler A method that takes a data and context and returns a value.
 */
export function onCall<T = any, Return = any | Promise<any>>(
  opts: CallableV1Options,
  handler: (data: T, context: CallableContext) => Return
): HttpsFunction & Runnable<T>;
export function onCall<T = any, Return = any | Promise<any>>(
  handler: (data: T, context: CallableContext) => Return
): HttpsFunction & Runnable<T>;
export function onCall<T = any, Return = any | Promise<any>>(
  optsOrHandler:
    | CallableV1Options
    | ((data: T, context: CallableContext) => Return),
  handler?: (data: T, context: CallableContext) => Return
): HttpsFunction & Runnable<T> {
  let opts: CallableV1Options;
  if (arguments.length == 1) {
    opts = {};
    handler = optsOrHandler as (data: T, context: CallableContext) => Return;
  } else {
    opts = optsOrHandler as CallableV1Options;
  }
  return _onCallWithOptions(opts, handler, {});
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
  convertIfPresent(
    cloudFunction.__trigger.httpsTrigger,
    options,
    'invoker',
    'invoker',
    convertInvoker
  );
  // TODO parse the options
  return cloudFunction;
}

/** @hidden */
export function _onCallWithOptions(
  opts: CallableV1Options,
  handler: (data: any, context: CallableContext) => any | Promise<any>,
  deployOpts: DeploymentOptions
): HttpsFunction & Runnable<any> {
  const origin = 'cors' in opts ? opts.cors : true;

  // onCallHandler sniffs the function length of the passed-in callback
  // and the user could have only tried to listen to data. Wrap their handler
  // in another handler to avoid accidentally triggering the v2 API
  const fixedLen = (data: any, context: CallableContext) =>
    handler(data, context);
  const func: any = onCallHandler(
    { ...opts, cors: { origin: origin, methods: 'POST' } },
    fixedLen
  );

  func.__trigger = {
    labels: {},
    ...optionsToTrigger(deployOpts),
    httpsTrigger: {},
  };
  func.__trigger.labels['deployment-callable'] = 'true';

  func.run = handler;

  return func;
}
