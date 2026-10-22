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

import * as express from "express";
import cors from "cors";
import { isDebugFeatureEnabled } from "../../common/debug";

import { convertIfPresent, convertInvoker } from "../../common/encoding";
import {
  CallableContext,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  resolveCorsOrigin,
  type CorsOption,
  Request,
  withErrorHandler,
} from "../../common/providers/https";
import { HttpsFunction, optionsToEndpoint, optionsToTrigger, Runnable } from "../cloud-functions";
import { DeploymentOptions } from "../function-configuration";
import { initV1Endpoint } from "../../runtime/manifest";
import { withInit } from "../../common/onInit";
import { wrapTraceContext } from "../../v2/trace";

export { HttpsError };
export type { Request, CallableContext, FunctionsErrorCode };

export interface HttpsOptions {
  /**
   * If true, allows CORS on requests to this function.
   * If this is a `string` or `RegExp`, allows requests from domains that match the provided value.
   * If this is an `Array`, allows requests from domains matching at least one entry of the array.
   */
  cors?: CorsOption;
}

/**
 * Handle HTTP requests.
 * @param optsOrHandler Options or a function that takes a request and response object,
 * same signature as an Express app.
 */
export function onRequest(
  optsOrHandler: HttpsOptions | ((req: Request, resp: express.Response) => void | Promise<void>),
  handler?: (req: Request, resp: express.Response) => void | Promise<void>
): HttpsFunction {
  let opts: HttpsOptions;
  let userHandler: (req: Request, resp: express.Response) => void | Promise<void>;
  if (typeof optsOrHandler === "function") {
    opts = {};
    userHandler = optsOrHandler;
  } else {
    opts = optsOrHandler;
    userHandler = handler!;
  }
  return _onRequestWithOptions(userHandler, opts);
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
  options: DeploymentOptions & HttpsOptions
): HttpsFunction {
  if (isDebugFeatureEnabled("enableCors") || "cors" in options) {
    const userProvidedHandler = handler;
    handler = (req: Request, res: express.Response): void | Promise<void> => {
      return new Promise((resolve) => {
        res.on("finish", resolve);
        // Because this function is called per request (not at global scope),
        // it is safe to read and resolve the CORS parameter here.
        const origin = resolveCorsOrigin(options.cors);
        const middleware = cors({ origin });
        middleware(req, res, () => {
          resolve(userProvidedHandler(req, res));
        });
      });
    };
  }

  // lets us add __endpoint without altering handler:
  const cloudFunction: any = (req: Request, res: express.Response) => {
    return wrapTraceContext(withInit(withErrorHandler(handler)))(req, res);
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
