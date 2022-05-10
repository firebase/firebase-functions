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

import {
  convertIfPresent,
  convertInvoker,
  copyIfPresent,
} from '../../common/encoding';
import {
  AuthData,
  onDispatchHandler,
  RateLimits,
  Request,
  RetryConfig,
} from '../../common/providers/tasks';
import * as options from '../options';
import { HttpsFunction } from './https';

export { AuthData, RateLimits, Request, RetryConfig };

export interface TaskQueueOptions extends options.EventHandlerOptions {
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

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string;

  /**
   * Amount of memory to allocate to a function.
   * A value of null restores the defaults of 256MB.
   */
  memory?: options.MemoryOption | null;

  /**
   * Timeout for the function in sections, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   * A value of null restores the default of 60s
   * The minimum timeout for a gen 2 function is 1s. The maximum timeout for a
   * function depends on the type of function: Event handling functions have a
   * maximum timeout of 540s (9 minutes). HTTPS and callable functions have a
   * maximum timeout of 36,00s (1 hour). Task queue functions have a maximum
   * timeout of 1,800s (30 minutes)
   */
  timeoutSeconds?: number | null;

  /**
   * Min number of actual instances to be running at a given time.
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   * A value of null restores the default min instances.
   */
  minInstances?: number | null;

  /**
   * Max number of instances to be running in parallel.
   * A value of null restores the default max instances.
   */
  maxInstances?: number | null;

  /**
   * Number of requests a function can serve at once.
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: number | null;

  /**
   * Fractional number of CPUs to allocate to a function.
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | 'gcf_gen1';

  /**
   * Connect cloud function to specified VPC connector.
   * A value of null removes the VPC connector
   */
  vpcConnector?: string | null;

  /**
   * Egress settings for VPC connector.
   * A value of null turns off VPC connector egress settings
   */
  vpcConnectorEgressSettings?: options.VpcEgressSetting | null;

  /**
   * Specific service account for the function to run as.
   * A value of null restores the default service account.
   */
  serviceAccount?: string | null;

  /**
   * Ingress settings which control where this function can be called from.
   * A value of null turns off ingress settings.
   */
  ingressSettings?: options.IngressSetting | null;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a function.
   */
  secrets?: string[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean;
}

/**
 * A handler for tasks.
 * @typeParam T - The task data interface. Task data is unmarshaled from JSON.
 */
export interface TaskQueueFunction<T = any> extends HttpsFunction {
  /**
   * The callback passed to the `TaskQueueFunction` constructor.
   * @param request - A TaskRequest containing data and auth information.
   * @returns Any return value. Google Cloud Functions will await any promise
   *          before shutting down your function. Resolved return values
   *          are only used for unit testing purposes.
   */
  run(request: Request<T>): void | Promise<void>;
}

/**
 * Creates a handler for tasks sent to a Google Cloud Tasks queue.
 * @param handler - A callback to handle task requests.
 * @typeParam Args - The interface for the request's `data` field.
 * @returns A Cloud Function you can export and deploy.
 */
export function onTaskDispatched<Args = any>(
  handler: (request: Request<Args>) => void | Promise<void>
): TaskQueueFunction<Args>;

/**
 * Creates a handler for tasks sent to a Google Cloud Tasks queue.
 * @param options - Configuration for the task queue or Cloud Function.
 * @param handler - A callback to handle task requests.
 * @typeParam Args - The interface for the request's `data` field.
 * @returns A Cloud Function you can export and deploy.
 */
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
