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

import * as options from '../options';
import {
  convertIfPresent,
  convertInvoker,
  copyIfPresent,
} from '../../common/encoding';
import { HttpsFunction } from './https';
import {
  AuthData,
  RateLimits,
  Request,
  RetryConfig,
  onDispatchHandler,
} from '../../common/providers/tasks';

export { AuthData, RateLimits, Request, RetryConfig as RetryPolicy };

export interface TaskQueueOptions extends options.GlobalOptions {
  retryConfig?: RetryConfig;
  rateLimits?: RateLimits;
  /**
   * Who can enqueue tasks for this function.
   * If left unspecified, only service accounts which have
   * roles/cloudtasks.enqueuer and roles/cloudfunctions.invoker
   * will have permissions.
   */
  invoker?: 'private' | string | string[];
}

export interface TaskQueueFunction<T = any> extends HttpsFunction {
  run(data: Request<T>): void | Promise<void>;
}

/** Handle a request sent to a Cloud Tasks queue. */
export function onTaskDispatched<Args = any>(
  handler: (request: Request<Args>) => void | Promise<void>
): TaskQueueFunction<Args>;
/** Handle a request sent to a Cloud Tasks queue. */
export function onTaskDispatched<Args = any>(
  options: TaskQueueOptions,
  handler: (request: Request<Args>) => void | Promise<void>
): TaskQueueFunction<Args>;
export function onTaskDispatched<Args = any>(
  optsOrHandler:
    | TaskQueueOptions
    | ((request: Request<Args>) => void | Promise<void>),
  handler?: (request: Request<Args>) => void | Promise<void>
): TaskQueueFunction<Args> {
  let opts: TaskQueueOptions;
  if (arguments.length == 1) {
    opts = {};
    handler = optsOrHandler as (request: Request<Args>) => void | Promise<void>;
  } else {
    opts = optsOrHandler as TaskQueueOptions;
  }

  // onDispatchHandler sniffs the function length to determine which API to present.
  // fix the length to prevent api versions from being mismatched.
  const fixedLen = (req: Request<Args>) => handler(req);
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
    taskQueueTrigger: {},
  };
  copyIfPresent(func.__endpoint.taskQueueTrigger, opts, 'retryConfig');
  copyIfPresent(func.__endpoint.taskQueueTrigger, opts, 'rateLimits');
  convertIfPresent(
      func.__endpoint.taskQueueTrigger,
      opts,
      'invoker',
      'invoker',
      convertInvoker
  );

  func.__requiredAPIs = [
    {
      api: 'cloudtasks.googleapis.com',
      reason: 'Needed for task queue functions',
    },
  ];

  func.run = handler;
  return func;
}
