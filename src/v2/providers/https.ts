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
import { convertIfPresent, convertInvoker, copyIfPresent } from "../../common/encoding";
import { wrapTraceContext } from "../trace";
import { isDebugFeatureEnabled } from "../../common/debug";
import { ResetValue } from "../../common/options";
import {
  CallableRequest,
  CallableResponse,
  FunctionsErrorCode,
  HttpsError,
  onCallHandler,
  Request,
  AuthData,
} from "../../common/providers/https";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import { GlobalOptions, SupportedRegion } from "../options";
import { Expression } from "../../params";
import { SecretParam } from "../../params/types";
import * as options from "../options";
import { withInit } from "../../common/onInit";
import * as logger from "../../logger";

export { Request, CallableRequest, CallableResponse, FunctionsErrorCode, HttpsError };

/**
 * Options that can be set on an onRequest HTTPS function.
 */
export interface HttpsOptions extends Omit<GlobalOptions, "region" | "enforceAppCheck"> {
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
  cors?:
    | string
    | Expression<string>
    | Expression<string[]>
    | boolean
    | RegExp
    | Array<string | RegExp>;

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
   * maximum timeout of 3,600s (1 hour). Task queue functions have a maximum
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
export interface CallableOptions<T = any> extends HttpsOptions {
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

  /**
   * Time in seconds between sending heartbeat messages to keep the connection
   * alive. Set to `null` to disable heartbeats.
   *
   * Defaults to 30 seconds.
   */
  heartbeatSeconds?: number | null;

  /**
   * (Deprecated) Callback for whether a request is authorized.
   *
   * Designed to allow reusable auth policies to be passed as an options object. Two built-in reusable policies exist:
   * isSignedIn and hasClaim.
   *
   * @deprecated
   */
  authPolicy?: (auth: AuthData | null, data: T) => boolean | Promise<boolean>;
}

/**
 * @deprecated
 *
 * An auth policy that requires a user to be signed in.
 */
export const isSignedIn =
  () =>
  (auth: AuthData | null): boolean =>
    !!auth;

/**
 * @deprecated
 *
 * An auth policy that requires a user to be both signed in and have a specific claim (optionally with a specific value)
 */
export const hasClaim =
  (claim: string, value?: string) =>
  (auth: AuthData | null): boolean => {
    if (!auth) {
      return false;
    }
    if (!(claim in auth.token)) {
      return false;
    }
    return !value || auth.token[claim] === value;
  };

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
export interface CallableFunction<T, Return, Stream = unknown> extends HttpsFunction {
  /** Executes the handler function with the provided data as input. Used for unit testing.
   * @param data - An input for the handler function.
   * @returns The output of the handler function.
   */
  run(request: CallableRequest<T>): Return;

  stream(
    request: CallableRequest<T>,
    response: CallableResponse<Stream>
  ): { stream: AsyncIterable<Stream>; output: Return };
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
    let origin = opts.cors instanceof Expression ? opts.cors.value() : opts.cors;
    if (isDebugFeatureEnabled("enableCors")) {
      // Respect `cors: false` to turn off cors even if debug feature is enabled.
      origin = opts.cors === false ? false : true;
    }
    // Arrays cause the access-control-allow-origin header to be dynamic based
    // on the origin header of the request. If there is only one element in the
    // array, this is unnecessary.
    if (Array.isArray(origin) && origin.length === 1) {
      origin = origin[0];
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
export function onCall<T = any, Return = any | Promise<any>, Stream = unknown>(
  opts: CallableOptions<T>,
  handler: (request: CallableRequest<T>, response?: CallableResponse<Stream>) => Return
): CallableFunction<T, Return extends Promise<unknown> ? Return : Promise<Return>, Stream>;

/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param handler - A function that takes a {@link https.CallableRequest}.
 * @returns A function that you can export and deploy.
 */
export function onCall<T = any, Return = any | Promise<any>, Stream = unknown>(
  handler: (request: CallableRequest<T>, response?: CallableResponse<Stream>) => Return
): CallableFunction<T, Return extends Promise<unknown> ? Return : Promise<Return>>;
export function onCall<T = any, Return = any | Promise<any>, Stream = unknown>(
  optsOrHandler: CallableOptions<T> | ((request: CallableRequest<T>) => Return),
  handler?: (request: CallableRequest<T>, response?: CallableResponse<Stream>) => Return
): CallableFunction<T, Return extends Promise<unknown> ? Return : Promise<Return>> {
  let opts: CallableOptions;
  if (arguments.length === 1) {
    opts = {};
    handler = optsOrHandler as (request: CallableRequest<T>) => Return;
  } else {
    opts = optsOrHandler as CallableOptions;
  }

  let cors: string | boolean | RegExp | Array<string | RegExp> | undefined;
  if ("cors" in opts) {
    if (opts.cors instanceof Expression) {
      cors = opts.cors.value();
    } else {
      cors = opts.cors;
    }
  } else {
    cors = true;
  }

  let origin = isDebugFeatureEnabled("enableCors") ? true : cors;
  // Arrays cause the access-control-allow-origin header to be dynamic based
  // on the origin header of the request. If there is only one element in the
  // array, this is unnecessary.
  if (Array.isArray(origin) && origin.length === 1) {
    origin = origin[0];
  }

  // fix the length of handler to make the call to handler consistent
  const fixedLen = (req: CallableRequest<T>, resp?: CallableResponse<Stream>) => handler(req, resp);
  let func: any = onCallHandler(
    {
      cors: { origin, methods: "POST" },
      enforceAppCheck: opts.enforceAppCheck ?? options.getGlobalOptions().enforceAppCheck,
      consumeAppCheckToken: opts.consumeAppCheckToken,
      heartbeatSeconds: opts.heartbeatSeconds,
      authPolicy: opts.authPolicy,
    },
    fixedLen,
    "gcfv2"
  );

  func = wrapTraceContext(withInit(func));

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

  // TODO: in the next major version, do auth/appcheck in these helper methods too.
  func.run = withInit(handler);
  func.stream = () => {
    return {
      stream: {
        next(): Promise<IteratorResult<Stream>> {
          return Promise.reject("Coming soon");
        },
      },
      output: Promise.reject("Coming soon"),
    };
  };
  return func;
}

// To avoid taking a strict dependency on Genkit we will redefine the limited portion of the interface we depend upon.
// A unit test (dev dependency) notifies us of breaking changes.
interface ZodType<T = any> {
  __output: T;
}

interface GenkitRunOptions {
  context?: any;
}

type GenkitAction<
  I extends ZodType = ZodType<any>,
  O extends ZodType = ZodType<any>,
  S extends ZodType = ZodType<any>,
> = {
  // NOTE: The return type from run includes trace data that we may one day like to use.
  run(input: I["__output"], options: GenkitRunOptions): Promise<{ result: O["__output"] }>;
  stream(
    input: I["__output"],
    options: GenkitRunOptions
  ): { stream: AsyncIterable<S["__output"]>; output: Promise<O["__output"]> };

  __action: {
    name: string;
  };
};

type ActionInput<F extends GenkitAction> = F extends GenkitAction<infer I extends ZodType, any, any>
  ? I["__output"]
  : never;
type ActionOutput<F extends GenkitAction> = F extends GenkitAction<
  any,
  infer O extends ZodType,
  any
>
  ? O["__output"]
  : never;
type ActionStream<F extends GenkitAction> = F extends GenkitAction<
  any,
  any,
  infer S extends ZodType
>
  ? S["__output"]
  : never;

export function onCallGenkit<A extends GenkitAction>(
  action: A
): CallableFunction<ActionInput<A>, Promise<ActionOutput<A>>, ActionStream<A>>;
export function onCallGenkit<A extends GenkitAction>(
  opts: CallableOptions<ActionInput<A>>,
  flow: A
): CallableFunction<ActionInput<A>, Promise<ActionOutput<A>>, ActionStream<A>>;
export function onCallGenkit<A extends GenkitAction>(
  optsOrAction: A | CallableOptions<ActionInput<A>>,
  action?: A
): CallableFunction<ActionInput<A>, Promise<ActionOutput<A>>, ActionStream<A>> {
  let opts: CallableOptions<ActionInput<A>>;
  if (arguments.length === 2) {
    opts = optsOrAction as CallableOptions<ActionInput<A>>;
  } else {
    opts = {};
    action = optsOrAction as A;
  }
  if (!opts.secrets?.length) {
    logger.debug(
      `Genkit function for ${action.__action.name} is not bound to any secret. This may mean that you are not storing API keys as a secret or that you are not binding your secret to this function. See https://firebase.google.com/docs/functions/config-env?gen=2nd#secret_parameters for more information.`
    );
  }
  const cloudFunction = onCall<ActionInput<A>, Promise<ActionOutput<A>>, ActionStream<A>>(
    opts,
    async (req, res) => {
      const context: Omit<CallableRequest, "data" | "rawRequest" | "acceptsStreaming"> = {};
      copyIfPresent(context, req, "auth", "app", "instanceIdToken");

      if (!req.acceptsStreaming) {
        const { result } = await action.run(req.data, { context });
        return result;
      }

      const { stream, output } = action.stream(req.data, { context });
      for await (const chunk of stream) {
        await res.sendChunk(chunk);
      }
      return output;
    }
  );

  cloudFunction.__endpoint.callableTrigger.genkitAction = action.__action.name;
  return cloudFunction;
}
