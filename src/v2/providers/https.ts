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

import * as cors from "cors";
import * as express from "express";
import { convertIfPresent, convertInvoker } from "../../common/encoding";
import { wrapTraceContext } from "../trace";
import { isDebugFeatureEnabled } from "../../common/debug";
import { ResetValue } from "../../common/options";
import {
  CallableRequest,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  Request,
} from "../../common/providers/https";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import { GlobalOptions, SupportedRegion } from "../options";
import { Expression } from "../../params";
import { SecretParam } from "../../params/types";
import * as options from "../options";
import { withInit } from "../../common/onInit";

export { Request, CallableRequest, FunctionsErrorCode, HttpsError };

/**
 * Options that can be set on an onRequest HTTPS function.
 */
export interface HttpsOptions extends Omit<GlobalOptions, "region"> {
  /**
   * If true, do not deploy or emulate this function.
   */
  omit?: boolean | Expression<boolean>;

  /** HTTP functions can override global options and can specify multiple regions to deploy to. */
  region?:
    | SupportedRegion
    | string
    | Array<SupportedRegion | string>
    | Expression<string>
    | ResetValue;

  /** If true, allows CORS on requests to this function.
   * If this is a `string` or `RegExp`, allows requests from domains that match the provided value.
   * If this is an `Array`, allows requests from domains matching at least one entry of the array.
   * Defaults to true for {@link https.CallableFunction} and false otherwise.
   */
  cors?: string | boolean | RegExp | Array<string | RegExp>;

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

  /**
   * Invoker to set access control on https functions.
   */
  invoker?: "public" | "private" | string | string[];
}

/**
 * Options that can be set on a callable HTTPS function.
 */
export interface CallableOptions extends HttpsOptions {
  /**
   * Determines whether Firebase AppCheck is enforced.
   * When true, requests with invalid tokens autorespond with a 401
   * (Unauthorized) error.
   * When false, requests with invalid tokens set event.app to undefiend.
   */
  enforceAppCheck?: boolean;

  /**
   * Determines whether Firebase App Check token is consumed on request. Defaults to false.
   *
   * @remarks
   * Set this to true to enable the App Check replay protection feature by consuming the App Check token on callable
   * request. Tokens that are found to be already consumed will have request.app.alreadyConsumed property set true.
   *
   *
   * Tokens are only considered to be consumed if it is sent to the App Check service by setting this option to true.
   * Other uses of the token do not consume it.
   *
   * This replay protection feature requires an additional network call to the App Check backend and forces the clients
   * to obtain a fresh attestation from the chosen attestation providers. This can therefore negatively impact
   * performance and can potentially deplete your attestation providers' quotas faster. Use this feature only for
   * protecting low volume, security critical, or expensive operations.
   *
   * This option does not affect the enforceAppCheck option. Setting the latter to true will cause the callable function
   * to automatically respond with a 401 Unauthorized status code when request includes an invalid App Check token.
   * When request includes valid but consumed App Check tokens, requests will not be automatically rejected. Instead,
   * the request.app.alreadyConsumed property will be set to true and pass the execution to the handler code for making
   * further decisions, such as requiring additional security checks or rejecting the request.
   */
  consumeAppCheckToken?: boolean;
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
  handler: (request: Request, response: express.Response) => void | Promise<void>
): HttpsFunction;
/**
 * Handles HTTPS requests.
 * @param handler - A function that takes a {@link https.Request} and response object, same signature as an Express app.
 * @returns A function that you can export and deploy.
 */
export function onRequest(
  handler: (request: Request, response: express.Response) => void | Promise<void>
): HttpsFunction;
export function onRequest(
  optsOrHandler:
    | HttpsOptions
    | ((request: Request, response: express.Response) => void | Promise<void>),
  handler?: (request: Request, response: express.Response) => void | Promise<void>
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

  if (isDebugFeatureEnabled("enableCors") || "cors" in opts) {
    let origin = opts.cors;
    if (isDebugFeatureEnabled("enableCors")) {
      // Respect `cors: false` to turn off cors even if debug feature is enabled.
      origin = opts.cors === false ? false : true;
    }
    // Arrays cause the access-control-allow-origin header to be dynamic based
    // on the origin header of the request. If there is only one element in the
    // array, this is unnecessary.
    if (Array.isArray(origin) && origin.length === 1) {
      origin = origin[1];
    }
    const middleware = cors({ origin });

    const userProvidedHandler = handler;
    handler = (req: Request, res: express.Response): void | Promise<void> => {
      return new Promise((resolve) => {
        res.on("finish", resolve);
        middleware(req, res, () => {
          resolve(userProvidedHandler(req, res));
        });
      });
    };
  }

  handler = wrapTraceContext(withInit(handler));

  Object.defineProperty(handler, "__trigger", {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(options.getGlobalOptions());
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToTriggerAnnotations(opts as options.GlobalOptions);
      const trigger: any = {
        platform: "gcfv2",
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
        options.getGlobalOptions(),
        "invoker",
        "invoker",
        convertInvoker
      );
      convertIfPresent(trigger.httpsTrigger, opts, "invoker", "invoker", convertInvoker);
      return trigger;
    },
  });

  const globalOpts = options.getGlobalOptions();
  const baseOpts = options.optionsToEndpoint(globalOpts);
  // global options calls region a scalar and https allows it to be an array,
  // but optionsToTriggerAnnotations handles both cases.
  const specificOpts = options.optionsToEndpoint(opts as options.GlobalOptions);
  const endpoint: Partial<ManifestEndpoint> = {
    ...initV2Endpoint(globalOpts, opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    httpsTrigger: {},
  };
  convertIfPresent(endpoint.httpsTrigger, globalOpts, "invoker", "invoker", convertInvoker);
  convertIfPresent(endpoint.httpsTrigger, opts, "invoker", "invoker", convertInvoker);
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
  opts: CallableOptions,
  handler: (request: CallableRequest<T>) => Return
): CallableFunction<T, Return extends Promise<unknown> ? Return : Promise<Return>>;

/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param handler - A function that takes a {@link https.CallableRequest}.
 * @returns A function that you can export and deploy.
 */
export function onCall<T = any, Return = any | Promise<any>>(
  handler: (request: CallableRequest<T>) => Return
): CallableFunction<T, Return extends Promise<unknown> ? Return : Promise<Return>>;
export function onCall<T = any, Return = any | Promise<any>>(
  optsOrHandler: CallableOptions | ((request: CallableRequest<T>) => Return),
  handler?: (request: CallableRequest<T>) => Return
): CallableFunction<T, Return extends Promise<unknown> ? Return : Promise<Return>> {
  let opts: CallableOptions;
  if (arguments.length === 1) {
    opts = {};
    handler = optsOrHandler as (request: CallableRequest<T>) => Return;
  } else {
    opts = optsOrHandler as CallableOptions;
  }

  let origin = isDebugFeatureEnabled("enableCors") ? true : "cors" in opts ? opts.cors : true;
  // Arrays cause the access-control-allow-origin header to be dynamic based
  // on the origin header of the request. If there is only one element in the
  // array, this is unnecessary.
  if (Array.isArray(origin) && origin.length === 1) {
    origin = origin[1];
  }

  // onCallHandler sniffs the function length to determine which API to present.
  // fix the length to prevent api versions from being mismatched.
  const fixedLen = (req: CallableRequest<T>) => withInit(handler)(req);
  let func: any = onCallHandler(
    {
      cors: { origin, methods: "POST" },
      enforceAppCheck: opts.enforceAppCheck ?? options.getGlobalOptions().enforceAppCheck,
      consumeAppCheckToken: opts.consumeAppCheckToken,
    },
    fixedLen
  );

  func = wrapTraceContext(func);

  Object.defineProperty(func, "__trigger", {
    get: () => {
      const baseOpts = options.optionsToTriggerAnnotations(options.getGlobalOptions());
      // global options calls region a scalar and https allows it to be an array,
      // but optionsToTriggerAnnotations handles both cases.
      const specificOpts = options.optionsToTriggerAnnotations(opts);
      return {
        platform: "gcfv2",
        ...baseOpts,
        ...specificOpts,
        labels: {
          ...baseOpts?.labels,
          ...specificOpts?.labels,
          "deployment-callable": "true",
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
    ...initV2Endpoint(options.getGlobalOptions(), opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    callableTrigger: {},
  };

  func.run = withInit(handler);
  return func;
}
