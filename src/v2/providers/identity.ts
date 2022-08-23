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
 * Cloud functions to handle events from Google Cloud Identity Platform.
 * @packageDocumentation
 */

import {
  AuthBlockingEvent,
  AuthUserRecord,
  AuthBlockingEventType,
  BeforeCreateResponse,
  BeforeSignInResponse,
  HttpsError,
  wrapHandler,
} from "../../common/providers/identity";
import { BlockingFunction } from "../../v1/cloud-functions";
import { wrapTraceContext } from "../trace";
import * as options from "../options";

export { AuthUserRecord, AuthBlockingEvent, HttpsError };

/** @hidden Internally used when parsing the options. */
interface InternalOptions {
  opts: options.GlobalOptions;
  idToken: boolean;
  accessToken: boolean;
  refreshToken: boolean;
}

/**
 * All function options plus idToken, accessToken, and refreshToken.
 */
export interface BlockingOptions {
  /** Pass the ID Token credential to the function. */
  idToken?: boolean;

  /** Pass the Access Token credential to the function. */
  accessToken?: boolean;

  /** Pass the Refresh Token credential to the function. */
  refreshToken?: boolean;

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
  cpu?: number | "gcf_gen1";

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
}

/**
 * Handles an event that is triggered before a user is created.
 * @param handler - Event handler which is run every time before a user is created
 */
export function beforeUserCreated(
  handler: (
    event: AuthBlockingEvent
  ) => BeforeCreateResponse | Promise<BeforeCreateResponse> | void | Promise<void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is created.
 * @param opts - Object containing function options
 * @param handler - Event handler which is run every time before a user is created
 */
export function beforeUserCreated(
  opts: BlockingOptions,
  handler: (
    event: AuthBlockingEvent
  ) => BeforeCreateResponse | Promise<BeforeCreateResponse> | void | Promise<void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is created
 * @param optsOrHandler - Either an object containing function options, or an event handler (run before user creation)
 * @param handler? - If defined, an event handler which is run every time before a user is created
 */
export function beforeUserCreated(
  optsOrHandler:
    | BlockingOptions
    | ((
        event: AuthBlockingEvent
      ) => BeforeCreateResponse | Promise<BeforeCreateResponse> | void | Promise<void>),
  handler?: (
    event: AuthBlockingEvent
  ) => BeforeCreateResponse | Promise<BeforeCreateResponse> | void | Promise<void>
): BlockingFunction {
  return beforeOperation("beforeCreate", optsOrHandler, handler);
}

/**
 * Handles an event that is triggered before a user is signed in.
 * @param handler - Event handler which is run every time before a user is signed in
 */
export function beforeUserSignedIn(
  handler: (
    event: AuthBlockingEvent
  ) => BeforeSignInResponse | Promise<BeforeSignInResponse> | void | Promise<void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is signed in.
 * @param opts - Object containing function options
 * @param handler - Event handler which is run every time before a user is signed in
 */
export function beforeUserSignedIn(
  opts: BlockingOptions,
  handler: (
    event: AuthBlockingEvent
  ) => BeforeSignInResponse | Promise<BeforeSignInResponse> | void | Promise<void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is signed in.
 * @param optsOrHandler - Either an object containing function options, or an event handler (run before user signin)
 * @param handler - Event handler which is run every time before a user is signed in
 */
export function beforeUserSignedIn(
  optsOrHandler:
    | BlockingOptions
    | ((
        event: AuthBlockingEvent
      ) => BeforeSignInResponse | Promise<BeforeSignInResponse> | void | Promise<void>),
  handler?: (
    event: AuthBlockingEvent
  ) => BeforeSignInResponse | Promise<BeforeSignInResponse> | void | Promise<void>
): BlockingFunction {
  return beforeOperation("beforeSignIn", optsOrHandler, handler);
}

/** @hidden */
export function beforeOperation(
  eventType: AuthBlockingEventType,
  optsOrHandler:
    | BlockingOptions
    | ((
        event: AuthBlockingEvent
      ) =>
        | BeforeCreateResponse
        | BeforeSignInResponse
        | void
        | Promise<BeforeCreateResponse>
        | Promise<BeforeSignInResponse>
        | Promise<void>),
  handler: (
    event: AuthBlockingEvent
  ) =>
    | BeforeCreateResponse
    | BeforeSignInResponse
    | void
    | Promise<BeforeCreateResponse>
    | Promise<BeforeSignInResponse>
    | Promise<void>
): BlockingFunction {
  if (!handler || typeof optsOrHandler === "function") {
    handler = optsOrHandler as (
      event: AuthBlockingEvent
    ) =>
      | BeforeCreateResponse
      | BeforeSignInResponse
      | void
      | Promise<BeforeCreateResponse>
      | Promise<BeforeSignInResponse>
      | Promise<void>;
    optsOrHandler = {};
  }

  const { opts, accessToken, idToken, refreshToken } = getOpts(optsOrHandler);

  // Create our own function that just calls the provided function so we know for sure that
  // handler takes one argument. This is something common/providers/identity depends on.
  const wrappedHandler = (event: AuthBlockingEvent) => handler(event);
  const func: any = wrapTraceContext(wrapHandler(eventType, wrappedHandler));

  const legacyEventType = `providers/cloud.auth/eventTypes/user.${eventType}`;

  /** Endpoint */
  const baseOptsEndpoint = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOptsEndpoint = options.optionsToEndpoint(opts);
  func.__endpoint = {
    platform: "gcfv2",
    ...baseOptsEndpoint,
    ...specificOptsEndpoint,
    labels: {
      ...baseOptsEndpoint?.labels,
      ...specificOptsEndpoint?.labels,
    },
    blockingTrigger: {
      eventType: legacyEventType,
      options: {
        accessToken,
        idToken,
        refreshToken,
      },
    },
  };

  func.__requiredAPIs = [
    {
      api: "identitytoolkit.googleapis.com",
      reason: "Needed for auth blocking functions",
    },
  ];

  func.run = handler;

  return func;
}

/** @hidden */
export function getOpts(blockingOptions: BlockingOptions): InternalOptions {
  const accessToken = blockingOptions.accessToken || false;
  const idToken = blockingOptions.idToken || false;
  const refreshToken = blockingOptions.refreshToken || false;
  const opts = { ...blockingOptions };
  delete (opts as any).accessToken;
  delete (opts as any).idToken;
  delete (opts as any).refreshToken;
  return {
    opts,
    accessToken,
    idToken,
    refreshToken,
  };
}
