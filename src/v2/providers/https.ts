// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
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

import * as cors from 'cors';
import * as express from 'express';
import { convertIfPresent, convertInvoker } from '../../common/encoding';

import {
  CallableRequest,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  Request,
} from '../../common/providers/https';
import { ManifestEndpoint } from '../../runtime/manifest';
import * as options from '../options';
import { GlobalOptions, SupportedRegion } from '../options';

export { Request, CallableRequest, FunctionsErrorCode, HttpsError };

/**
 * Options that can be set on an individual HTTPS function.
 */
export interface HttpsOptions extends Omit<GlobalOptions, 'region'> {
  /** HTTP functions can override global options and can specify multiple regions to deploy to. */
  region?: SupportedRegion | string | Array<SupportedRegion | string>;
  /** If true, allows CORS on requests to this function.
   * If this is a `string` or `RegExp`, allows requests from domains that match the provided value.
   * If this is an `Array`, allows requests from domains matching at least one entry of the array.
   * Defaults to true for {@link https.CallableFunction} and false otherwise.
   */
  cors?: string | boolean | RegExp | Array<string | RegExp>;
}

/**
 * Handles HTTPS requests.
 */
export type HttpsFunction = ((
  /** An Express request object representing the HTTPS call to the function. */
  req: Request,
  /** An Express response object, for this function to respond to callers. */
  res: express.Response
) => void | Promise<void>) & {
  /** @alpha */
  __trigger?: unknown;
  /** @alpha */
  __endpoint: ManifestEndpoint;
};

/**
 * Creates a callable method for clients to call using a Firebase SDK.
 */
export interface CallableFunction<T, Return> extends HttpsFunction {
  /** Executes the handler function with the provided data as input. Used for unit testing.
   * @param data - An input for the handler function.
   * @returns The output of the handler function.
   */
  run(data: CallableRequest<T>): Return;
}
/**
 * Handles HTTPS requests.
 * @param opts - Options to set on this function
 * @param handler - A function that takes a {@link https.Request} and response object, same signature as an Express app.
 * @returns A function that you can export and deploy.
 */
export function onRequest(
  opts: HttpsOptions,
  handler: (
    request: Request,
    response: express.Response
  ) => void | Promise<void>
): HttpsFunction;
/**
 * Handles HTTPS requests.
 * @param handler - A function that takes a {@link https.Request} and response object, same signature as an Express app.
 * @returns A function that you can export and deploy.
 */
export function onRequest(
  handler: (
    request: Request,
    response: express.Response
  ) => void | Promise<void>
): HttpsFunction;
export function onRequest(
  optsOrHandler:
    | HttpsOptions
    | ((request: Request, response: express.Response) => void | Promise<void>),
  handler?: (
    request: Request,
    response: express.Response
  ) => void | Promise<void>
): HttpsFunction {
  let opts: HttpsOptions;
  if (arguments.length === 1) {
    opts = {};
    handler = optsOrHandler as (
      request: Request,
      response: express.Response
    ) => void | Promise<void>;
  } else {
    opts = optsOrHandler as HttpsOptions;
  }

  if ('cors' in opts) {
    const userProvidedHandler = handler;
    handler = (req: Request, res: express.Response): void | Promise<void> => {
      return new Promise((resolve) => {
        res.on('finish', resolve);
        cors({ origin: opts.cors })(req, res, () => {
          resolve(userProvidedHandler(req, res));
        });
      });
    };
  }

  Object.defineProperty(handler, '__trigger', {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(
        options.getGlobalOptions()
      );
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToTriggerAnnotations(
        opts as options.GlobalOptions
      );
      const trigger: any = {
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
        },
        httpsTrigger: {
          allowInsecure: false,
        },
      };
      convertIfPresent(
        trigger.httpsTrigger,
        opts,
        'invoker',
        'invoker',
        convertInvoker
      );
      return trigger;
    },
  });

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToTriggerAnnotations handles both cases.
  const specificOpts = options.optionsToEndpoint(opts as options.GlobalOptions);
  const endpoint: Partial<ManifestEndpoint> = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    httpsTrigger: {},
  };
  convertIfPresent(
    endpoint.httpsTrigger,
    opts,
    'invoker',
    'invoker',
    convertInvoker
  );
  (handler as HttpsFunction).__endpoint = endpoint;

  return handler as HttpsFunction;
}

/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param opts - Options to set on this function.
 * @param handler - A function that takes a {@link https.CallableRequest}.
 * @returns A function that you can export and deploy.
 */
export function onCall<T = any, Return = any | Promise<any>>(
  opts: HttpsOptions,
  handler: (request: CallableRequest<T>) => Return
): CallableFunction<T, Return>;
/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param handler - A function that takes a {@link https.CallableRequest}.
 * @returns A function that you can export and deploy.
 */
export function onCall<T = any, Return = any | Promise<any>>(
  handler: (request: CallableRequest<T>) => Return
): CallableFunction<T, Return>;
export function onCall<T = any, Return = any | Promise<any>>(
  optsOrHandler: HttpsOptions | ((request: CallableRequest<T>) => Return),
  handler?: (request: CallableRequest<T>) => Return
): CallableFunction<T, Return> {
  let opts: HttpsOptions;
  if (arguments.length == 1) {
    opts = {};
    handler = optsOrHandler as (request: CallableRequest<T>) => Return;
  } else {
    opts = optsOrHandler as HttpsOptions;
  }

  const origin = 'cors' in opts ? opts.cors : true;

  // onCallHandler sniffs the function length to determine which API to present.
  // fix the length to prevent api versions from being mismatched.
  const fixedLen = (req: CallableRequest<T>) => handler(req);
  const func: any = onCallHandler(
    { cors: { origin, methods: 'POST' } },
    fixedLen
  );

  Object.defineProperty(func, '__trigger', {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(
        options.getGlobalOptions()
      );
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToTriggerAnnotations(opts);
      return {
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
          'deployment-callable': 'true',
        },
        httpsTrigger: {
          allowInsecure: false,
        },
      };
    },
  });

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToEndpoint handles both cases.
  const specificOpts = options.optionsToEndpoint(opts);
  func.__endpoint = {
    platform: 'gcfv2',
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    callableTrigger: {},
  };

  func.run = handler;
  return func;
}
