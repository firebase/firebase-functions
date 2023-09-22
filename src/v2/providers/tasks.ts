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

/**
 * Cloud functions to handle Tasks enqueued with Google Cloud Tasks.
 * @packageDocumentation
 */

import { convertIfPresent, convertInvoker, copyIfPresent } from "../../common/encoding";
import { ResetValue } from "../../common/options";
import {
  AuthData,
  onDispatchHandler,
  RateLimits,
  Request,
  RetryConfig,
} from "../../common/providers/tasks";
import * as options from "../options";
import { wrapTraceContext } from "../trace";
import { HttpsFunction } from "./https";
import { Expression } from "../../params";
import { SecretParam } from "../../params/types";
import { initV2Endpoint, initTaskQueueTrigger } from "../../runtime/manifest";

export { AuthData, Request, RateLimits, RetryConfig };

export interface TaskQueueOptions extends options.EventHandlerOptions {
  /** How a task should be retried in the event of a non-2xx return. */
  retryConfig?: RetryConfig;

  /** How congestion control should be applied to the function. */
  rateLimits?: RateLimits;

  /**
   * Who can enqueue tasks for this function.
   *
   * @remakrs
   * If left unspecified, only service accounts which have
   * `roles/cloudtasks.enqueuer` and `roles/cloudfunctions.invoker`
   * will have permissions.
   */
  invoker?: "private" | string | string[];

  /**
   * If true, do not deploy or emulate this function.
   */
  omit?: boolean | Expression<boolean>;

  /**
   * Region where functions should be deployed.
   */
  region?: options.SupportedRegion | string | Expression<string> | ResetValue;

  /**
   * Amount of memory to allocate to a function.
   */
  memory?: options.MemoryOption | Expression<number> | ResetValue;

  /**
   * Timeout for the function in seconds, possible values are 0 to 540.
   * HTTPS functions can specify a higher timeout.
   *
   * @remarks
   * The minimum timeout for a gen 2 function is 1s. The maximum timeout for a
   * function depends on the type of function: Event handling functions have a
   * maximum timeout of 540s (9 minutes). HTTPS and callable functions have a
   * maximum timeout of 36,00s (1 hour). Task queue functions have a maximum
   * timeout of 1,800s (30 minutes)
   */
  timeoutSeconds?: number | Expression<number> | ResetValue;

  /**
   * Min number of actual instances to be running at a given time.
   *
   * @remarks
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   */
  minInstances?: number | Expression<number> | ResetValue;

  /**
   * Max number of instances to be running in parallel.
   */
  maxInstances?: number | Expression<number> | ResetValue;

  /**
   * Number of requests a function can serve at once.
   *
   * @remarks
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: number | Expression<number> | ResetValue;

  /**
   * Fractional number of CPUs to allocate to a function.
   *
   * @remarks
   * Defaults to 1 for functions with <= 2GB RAM and increases for larger memory sizes.
   * This is different from the defaults when using the gcloud utility and is different from
   * the fixed amount assigned in Google Cloud Functions generation 1.
   * To revert to the CPU amounts used in gcloud or in Cloud Functions generation 1, set this
   * to the value "gcf_gen1"
   */
  cpu?: number | "gcf_gen1";

  /**
   * Connect cloud function to specified VPC connector.
   */
  vpcConnector?: string | Expression<string> | ResetValue;

  /**
   * Egress settings for VPC connector.
   */
  vpcConnectorEgressSettings?: options.VpcEgressSetting | ResetValue;

  /**
   * Specific service account for the function to run as.
   */
  serviceAccount?: string | Expression<string> | ResetValue;

  /**
   * Ingress settings which control where this function can be called from.
   */
  ingressSettings?: options.IngressSetting | ResetValue;

  /**
   * User labels to set on the function.
   */
  labels?: Record<string, string>;

  /*
   * Secrets to bind to a function.
   */
  secrets?: (string | SecretParam)[];

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
 * @returns A function you can export and deploy.
 */
export function onTaskDispatched<Args = any>(
  handler: (request: Request<Args>) => void | Promise<void>
): TaskQueueFunction<Args>;

/**
 * Creates a handler for tasks sent to a Google Cloud Tasks queue.
 * @param options - Configuration for the task queue or Cloud Function.
 * @param handler - A callback to handle task requests.
 * @typeParam Args - The interface for the request's `data` field.
 * @returns A function you can export and deploy.
 */
export function onTaskDispatched<Args = any>(
  options: TaskQueueOptions,
  handler: (request: Request<Args>) => void | Promise<void>
): TaskQueueFunction<Args>;
export function onTaskDispatched<Args = any>(
  optsOrHandler: TaskQueueOptions | ((request: Request<Args>) => void | Promise<void>),
  handler?: (request: Request<Args>) => void | Promise<void>
): TaskQueueFunction<Args> {
  let opts: TaskQueueOptions;
  if (arguments.length === 1) {
    opts = {};
    handler = optsOrHandler as (request: Request<Args>) => void | Promise<void>;
  } else {
    opts = optsOrHandler as TaskQueueOptions;
  }

  // onDispatchHandler sniffs the function length to determine which API to present.
  // fix the length to prevent api versions from being mismatched.
  const fixedLen = (req: Request<Args>) => handler(req);
  const func: any = wrapTraceContext(onDispatchHandler(fixedLen));

  Object.defineProperty(func, "__trigger", {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(options.getGlobalOptions());
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToTriggerAnnotations(opts as options.GlobalOptions);
      const taskQueueTrigger: Record<string, unknown> = {};
      copyIfPresent(taskQueueTrigger, opts, "retryConfig", "rateLimits");
      convertIfPresent(
        taskQueueTrigger,
        options.getGlobalOptions(),
        "invoker",
        "invoker",
        convertInvoker
      );
      convertIfPresent(taskQueueTrigger, opts, "invoker", "invoker", convertInvoker);
      return {
        platform: "gcfv2",
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
    platform: "gcfv2",
    ...initV2Endpoint(options.getGlobalOptions(), opts),
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    taskQueueTrigger: initTaskQueueTrigger(options.getGlobalOptions(), opts),
  };

  copyIfPresent(
    func.__endpoint.taskQueueTrigger.retryConfig,
    opts.retryConfig,
    "maxAttempts",
    "maxBackoffSeconds",
    "maxDoublings",
    "maxRetrySeconds",
    "minBackoffSeconds"
  );
  copyIfPresent(
    func.__endpoint.taskQueueTrigger.rateLimits,
    opts.rateLimits,
    "maxConcurrentDispatches",
    "maxDispatchesPerSecond"
  );
  convertIfPresent(
    func.__endpoint.taskQueueTrigger,
    options.getGlobalOptions(),
    "invoker",
    "invoker",
    convertInvoker
  );
  convertIfPresent(func.__endpoint.taskQueueTrigger, opts, "invoker", "invoker", convertInvoker);
  copyIfPresent(func.__endpoint.taskQueueTrigger, opts, "retry", "retry")

  func.__requiredAPIs = [
    {
      api: "cloudtasks.googleapis.com",
      reason: "Needed for task queue functions",
    },
  ];

  func.run = handler;
  return func;
}
