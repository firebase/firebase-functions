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

import {
  HttpsFunction,
  optionsToEndpoint,
  optionsToTrigger,
  Runnable,
} from '../cloud-functions';
import {
  convertIfPresent,
  convertInvoker,
  copyIfPresent,
} from '../common/encoding';
import {
  CallableContext,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  onDispatchHandler,
  Request,
  TaskContext,
  TaskRateLimits,
  TaskRetryConfig,
} from '../common/providers/https';
import { DeploymentOptions } from '../function-configuration';
import { ManifestEndpoint, ManifestRequiredAPI } from '../runtime/manifest';

export {
  Request,
  CallableContext,
  FunctionsErrorCode,
  HttpsError,
  /** @hidden */
  TaskRetryConfig as TaskRetryPolicy,
  /** @hidden */
  TaskRateLimits,
  /** @hidden */
  TaskContext,
};

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

/**
 * Configurations for Task Queue Functions.
 * @hidden
 */
export interface TaskQueueOptions {
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

/** @hidden */
export interface TaskQueueFunction {
  (req: Request, res: express.Response): Promise<void>;
  __trigger: unknown;
  __endpoint: ManifestEndpoint;
  __requiredAPIs?: ManifestRequiredAPI[];
  run(data: any, context: TaskContext): void | Promise<void>;
}

/** @hidden */
export class TaskQueueBuilder {
  /** @internal */
  constructor(
    private readonly tqOpts?: TaskQueueOptions,
    private readonly depOpts?: DeploymentOptions
  ) {}

  onDispatch(
    handler: (data: any, context: TaskContext) => void | Promise<void>
  ): TaskQueueFunction {
    // onEnqueueHandler sniffs the function length of the passed-in callback
    // and the user could have only tried to listen to data. Wrap their handler
    // in another handler to avoid accidentally triggering the v2 API
    const fixedLen = (data: any, context: TaskContext) =>
      handler(data, context);
    const func: any = onDispatchHandler(fixedLen);

    func.__trigger = {
      ...optionsToTrigger(this.depOpts || {}),
      taskQueueTrigger: {},
    };
    copyIfPresent(func.__trigger.taskQueueTrigger, this.tqOpts, 'retryConfig');
    copyIfPresent(func.__trigger.taskQueueTrigger, this.tqOpts, 'rateLimits');
    convertIfPresent(
      func.__trigger.taskQueueTrigger,
      this.tqOpts,
      'invoker',
      'invoker',
      convertInvoker
    );

    func.__endpoint = {
      platform: 'gcfv1',
      ...optionsToEndpoint(this.depOpts),
      taskQueueTrigger: {},
    };
    copyIfPresent(func.__endpoint.taskQueueTrigger, this.tqOpts, 'retryConfig');
    copyIfPresent(func.__endpoint.taskQueueTrigger, this.tqOpts, 'rateLimits');
    convertIfPresent(
      func.__endpoint.taskQueueTrigger,
      this.tqOpts,
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
}

/**
 * Declares a function that can handle tasks enqueued using the Firebase Admin SDK.
 * @param options Configuration for the Task Queue that feeds into this function.
 * @hidden
 */
export function taskQueue(options?: TaskQueueOptions): TaskQueueBuilder {
  return new TaskQueueBuilder(options);
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

  cloudFunction.__endpoint = {
    platform: 'gcfv1',
    ...optionsToEndpoint(options),
    httpsTrigger: {},
  };
  convertIfPresent(
    cloudFunction.__endpoint.httpsTrigger,
    options,
    'invoker',
    'invoker',
    convertInvoker
  );
  return cloudFunction;
}

/** @hidden */
export function _onCallWithOptions(
  handler: (data: any, context: CallableContext) => any | Promise<any>,
  options: DeploymentOptions
): HttpsFunction & Runnable<any> {
  // onCallHandler sniffs the function length of the passed-in callback
  // and the user could have only tried to listen to data. Wrap their handler
  // in another handler to avoid accidentally triggering the v2 API
  const fixedLen = (data: any, context: CallableContext) =>
    handler(data, context);
  const func: any = onCallHandler(
    {
      allowInvalidAppCheckToken: options.allowInvalidAppCheckToken,
      cors: { origin: true, methods: 'POST' },
    },
    fixedLen
  );

  func.__trigger = {
    labels: {},
    ...optionsToTrigger(options),
    httpsTrigger: {},
  };
  func.__trigger.labels['deployment-callable'] = 'true';

  func.__endpoint = {
    platform: 'gcfv1',
    labels: {},
    ...optionsToEndpoint(options),
    callableTrigger: {},
  };

  func.run = handler;

  return func;
}
