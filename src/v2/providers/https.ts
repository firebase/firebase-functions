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

/**
 * Cloud functions to handle HTTPS request or callable RPCs.
 * @packageDocumentation
 */

import * as cors from 'cors';
import * as express from 'express';
import { convertIfPresent, convertInvoker } from '../../common/encoding';

import { isDebugFeatureEnabled } from '../../common/debug';
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
import { Expression, Field } from '../expressions';

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

  /**
   * Amount of memory to allocate to a function.
   * A value of null restores the defaults of 256MB.
   */
  memory?: options.MemoryOption | Expression<number> | null;

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
  timeoutSeconds?: Field<number>;

  /**
   * Min number of actual instances to be running at a given time.
   * Instances will be billed for memory allocation and 10% of CPU allocation
   * while idle.
   * A value of null restores the default min instances.
   */
  minInstances?: Field<number>;

  /**
   * Max number of instances to be running in parallel.
   * A value of null restores the default max instances.
   */
  maxInstances?: Field<number>;

  /**
   * Number of requests a function can serve at once.
   * Can only be applied to functions running on Cloud Functions v2.
   * A value of null restores the default concurrency (80 when CPU >= 1, 1 otherwise).
   * Concurrency cannot be set to any value other than 1 if `cpu` is less than 1.
   * The maximum value for concurrency is 1,000.
   */
  concurrency?: Field<number>;

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

  /**
   * Invoker to set access control on https functions.
   */
  invoker?: 'public' | 'private' | string | string[];

  /*
   * Secrets to bind to a function.
   */
  secrets?: string[];

  /** Whether failed executions should be delivered again. */
  retry?: boolean;
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

  if (isDebugFeatureEnabled('enableCors') || 'cors' in opts) {
    const origin = isDebugFeatureEnabled('enableCors') ? true : opts.cors;
    const userProvidedHandler = handler;
    handler = (req: Request, res: express.Response): void | Promise<void> => {
      return new Promise((resolve) => {
        res.on('finish', resolve);
        cors({ origin })(req, res, () => {
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

  const origin = isDebugFeatureEnabled('enableCors')
    ? true
    : 'cors' in opts
    ? opts.cors
    : true;

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
