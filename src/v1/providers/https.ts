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

import express from "express";

import { convertIfPresent, convertInvoker } from "../../common/encoding";
import {
  CallableContext,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  Request,
} from "../../common/providers/https";
import { HttpsFunction, optionsToEndpoint, optionsToTrigger, Runnable } from "../cloud-functions";
import { DeploymentOptions } from "../function-configuration";
import { initV1Endpoint } from "../../runtime/manifest";
import { withInit } from "../../common/onInit";
import { wrapTraceContext } from "../../v2/trace";

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

/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param handler A method that takes a data and context and returns a value.
 */
export function onCall(
  handler: (data: any, context: CallableContext) => any | Promise<any>
): HttpsFunction & Runnable<any> {
  return _onCallWithOptions(handler, {});
}

/** @internal */
export function _onRequestWithOptions(
  handler: (req: Request, resp: express.Response) => void | Promise<void>,
  options: DeploymentOptions
): HttpsFunction {
  // lets us add __endpoint without altering handler:
  const cloudFunction: any = (req: Request, res: express.Response) => {
    return wrapTraceContext(withInit(handler))(req, res);
  };
  cloudFunction.__trigger = {
    ...optionsToTrigger(options),
    httpsTrigger: {},
  };
  convertIfPresent(
    cloudFunction.__trigger.httpsTrigger,
    options,
    "invoker",
    "invoker",
    convertInvoker
  );
  // TODO parse the options

  cloudFunction.__endpoint = {
    platform: "gcfv1",
    ...initV1Endpoint(options),
    ...optionsToEndpoint(options),
    httpsTrigger: {},
  };
  convertIfPresent(
    cloudFunction.__endpoint.httpsTrigger,
    options,
    "invoker",
    "invoker",
    convertInvoker
  );
  return cloudFunction;
}

/** @internal */
export function _onCallWithOptions(
  handler: (data: any, context: CallableContext) => any | Promise<any>,
  options: DeploymentOptions
): HttpsFunction & Runnable<any> {
  // fix the length of handler to make the call to handler consistent
  // in the onCallHandler
  const fixedLen = (data: any, context: CallableContext) => {
    return withInit(handler)(data, context);
  };
  const func: any = wrapTraceContext(
    onCallHandler(
      {
        enforceAppCheck: options.enforceAppCheck,
        consumeAppCheckToken: options.consumeAppCheckToken,
        cors: { origin: true, methods: "POST" },
      },
      fixedLen,
      "gcfv1"
    )
  );

  func.__trigger = {
    labels: {},
    ...optionsToTrigger(options),
    httpsTrigger: {},
  };
  func.__trigger.labels["deployment-callable"] = "true";

  func.__endpoint = {
    platform: "gcfv1",
    labels: {},
    ...initV1Endpoint(options),
    ...optionsToEndpoint(options),
    callableTrigger: {},
  };

  func.run = fixedLen;

  return func;
}
