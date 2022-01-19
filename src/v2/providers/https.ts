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
import {
  convertIfPresent,
  convertInvoker,
  copyIfPresent,
} from '../../common/encoding';

import { ManifestEndpoint } from '../../common/manifest';
import {
  CallableRequest,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  onDispatchHandler,
  Request,
  TaskRateLimits,
  TaskRequest,
  TaskRetryConfig,
} from '../../common/providers/https';
import * as options from '../options';

export {
  Request,
  CallableRequest,
  FunctionsErrorCode,
  HttpsError,
  TaskRateLimits,
  TaskRequest,
  TaskRetryConfig as TaskRetryPolicy,
};

export interface HttpsOptions extends Omit<options.GlobalOptions, 'region'> {
  region?:
    | options.SupportedRegion
    | string
    | Array<options.SupportedRegion | string>;
  cors?: string | boolean | RegExp | Array<string | RegExp>;
}

export interface TaskQueueOptions extends options.GlobalOptions {
  retryConfig?: TaskRetryConfig;
  rateLimits?: TaskRateLimits;
  /**
   * Who can enqueue tasks for this function.
   * If left unspecified, only service accounts which have
   * roles/cloudtasks.enqueuer and roles/cloudfunctions.invoker
   * will have permissions.
   */
  invoker?: 'private' | string | string[];
}

export type HttpsFunction = ((
  req: Request,
  res: express.Response
) => void | Promise<void>) & {
  __trigger?: unknown;
  __endpoint: ManifestEndpoint;
};
export interface CallableFunction<T, Return> extends HttpsFunction {
  run(data: CallableRequest<T>): Return;
}
export interface TaskQueueFunction<T = any> extends HttpsFunction {
  run(data: TaskRequest<T>): void | Promise<void>;
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

  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToManifestEndpoint handles both cases.
  const specificOpts = options.optionsToEndpoint(opts as options.GlobalOptions);
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

/** Handle a request sent to a Cloud Tasks queue. */
export function onTaskDispatched<Args = any>(
  handler: (request: TaskRequest<Args>) => void | Promise<void>
): TaskQueueFunction<Args>;

/** Handle a request sent to a Cloud Tasks queue. */
export function onTaskDispatched<Args = any>(
  options: TaskQueueOptions,
  handler: (request: TaskRequest<Args>) => void | Promise<void>
): TaskQueueFunction<Args>;

export function onTaskDispatched<Args = any>(
  optsOrHandler:
    | TaskQueueOptions
    | ((request: TaskRequest<Args>) => void | Promise<void>),
  handler?: (request: TaskRequest<Args>) => void | Promise<void>
): TaskQueueFunction<Args> {
  let opts: TaskQueueOptions;
  if (arguments.length == 1) {
    opts = {};
    handler = optsOrHandler as (
      request: TaskRequest<Args>
    ) => void | Promise<void>;
  } else {
    opts = optsOrHandler as TaskQueueOptions;
  }

  // onEnqueueHandler sniffs the function length to determine which API to present.
  // fix the length to prevent api versions from being mismatched.
  const fixedLen = (req: TaskRequest<Args>) => handler(req);
  const func: any = onDispatchHandler(fixedLen);

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
      const taskQueueTrigger: Record<string, unknown> = {};
      copyIfPresent(taskQueueTrigger, opts, 'retryConfig', 'rateLimits');
      convertIfPresent(
        taskQueueTrigger,
        opts,
        'invoker',
        'invoker',
        convertInvoker
      );
      return {
        apiVersion: 2,
        platform: 'gcfv2',
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
        },
        taskQueueTrigger,
      };
    },
  });

  func.run = handler;
  return func;
}
