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

import * as options from '../options';
import {
  CallableRequest,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  Request,
} from '../../common/providers/https';
import { ManifestEndpoint } from '../../common/manifest/v1alpha1';

export { Request, CallableRequest, FunctionsErrorCode, HttpsError };

export interface HttpsOptions extends Omit<options.GlobalOptions, 'region'> {
  region?:
    | options.SupportedRegion
    | string
    | Array<options.SupportedRegion | string>;
  cors?: string | boolean | RegExp | Array<string | RegExp>;
}

export type HttpsFunction = ((
  req: Request,
  res: express.Response
) => void | Promise<void>) & { __trigger: unknown } & { __endpoint: unknown };
export interface CallableFunction<T, Return> extends HttpsFunction {
  run(data: CallableRequest<T>): Return;
}

export function onRequest(
  opts: HttpsOptions,
  handler: (
    request: Request,
    response: express.Response
  ) => void | Promise<void>
): HttpsFunction;
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
        // TODO(inlined): Remove "apiVersion" once the latest version of the CLI
        // has migrated to "platform".
        apiVersion: 2,
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

  Object.defineProperty(handler, '__endpoint', {
    get: () => {
      const baseOpts = options.optionsToManifestEndpoint(
        options.getGlobalOptions()
      );
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToManifestEndpoint(
        opts as options.GlobalOptions
      );
      const endpoint: ManifestEndpoint = {
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
      return endpoint;
    },
  });

  return handler as HttpsFunction;
}

export function onCall<T = any, Return = any | Promise<any>>(
  opts: HttpsOptions,
  handler: (request: CallableRequest<T>) => Return
): CallableFunction<T, Return>;
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
      const specificOpts = options.optionsToTriggerAnnotations(
        opts as options.GlobalOptions
      );
      return {
        // TODO(inlined): Remove "apiVersion" once the latest version of the CLI
        // has migrated to "platform".
        apiVersion: 2,
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

  Object.defineProperty(func, '__endpoint', {
    get: () => {
      const baseOpts = options.optionsToManifestEndpoint(
        options.getGlobalOptions()
      );
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToManifestEndpoint(
        opts as options.GlobalOptions
      );
      return {
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
          'deployment-callable': 'true',
        },
        httpsTrigger: {},
      };
    },
  });

  func.run = handler;
  return func;
}
