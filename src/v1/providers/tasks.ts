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

import * as express from 'express';

import {
  convertIfPresent,
  convertInvoker,
  copyIfPresent,
} from '../../common/encoding';
import { Request } from '../../common/providers/https';
import {
  onDispatchHandler,
  RateLimits,
  RetryConfig,
  TaskContext,
} from '../../common/providers/tasks';
import { ManifestEndpoint, ManifestRequiredAPI } from '../../runtime/manifest';
import { optionsToEndpoint } from '../cloud-functions';
import { DeploymentOptions } from '../function-configuration';

export { RetryConfig, RateLimits, TaskContext };

/**
 * Options for configuring the task queue to listen to.
 */
export interface TaskQueueOptions {
  /** How a task should be retried in the event of a non-2xx return. */
  retryConfig?: RetryConfig;
  /** How congestion control should be applied to the function. */
  rateLimits?: RateLimits;

  /**
   * Who can enqueue tasks for this function.
   * If left unspecified, only service accounts which have
   * `roles/cloudtasks.enqueuer` and `roles/cloudfunctions.invoker`
   * will have permissions.
   */
  invoker?: 'private' | string | string[];
}

/**
 * A handler for tasks.
 */
export interface TaskQueueFunction {
  (req: Request, res: express.Response): Promise<void>;

  /** @alpha */
  __endpoint: ManifestEndpoint;

  /** @alpha */
  __requiredAPIs?: ManifestRequiredAPI[];

  /**
   * The callback passed to the `TaskQueueFunction` constructor.
   * @param data - The body enqueued into a task queue.
   * @param context - The request context of the enqueued task
   * @returns Any return value. Google Cloud Functions will await any promise
   *          before shutting down your function. Resolved return values
   *          are only used for unit testing purposes.
   */
  run(data: any, context: TaskContext): void | Promise<void>;
}

/**
 * Builder for creating a `TaskQueueFunction`.
 */
export class TaskQueueBuilder {
  /** @internal */
  constructor(
    private readonly tqOpts?: TaskQueueOptions,
    private readonly depOpts?: DeploymentOptions
  ) {}

  /**
   * Creates a handler for tasks sent to a Google Cloud Tasks queue.
   * @param handler - A callback to handle task requests.
   * @returns A Cloud Function you can export and deploy.
   */
  onDispatch(
    handler: (data: any, context: TaskContext) => void | Promise<void>
  ): TaskQueueFunction {
    // onEnqueueHandler sniffs the function length of the passed-in callback
    // and the user could have only tried to listen to data. Wrap their handler
    // in another handler to avoid accidentally triggering the v2 API
    const fixedLen = (data: any, context: TaskContext) =>
      handler(data, context);
    const func: any = onDispatchHandler(fixedLen);

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
 * @param options - Configuration for the Task Queue that feeds into this function.
 *        Omitting options will configure a Task Queue with default settings.
 */
export function taskQueue(options?: TaskQueueOptions): TaskQueueBuilder {
  return new TaskQueueBuilder(options);
}
