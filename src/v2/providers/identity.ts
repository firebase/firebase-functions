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
import { ResetValue } from "../../common/options";
import {
  AuthBlockingEvent,
  AuthBlockingEventType,
  AuthUserRecord,
  BeforeCreateResponse,
  BeforeSignInResponse,
  BeforeEmailResponse,
  BeforeSmsResponse,
  HandlerV2,
  HttpsError,
  wrapHandler,
  MaybeAsync,
} from "../../common/providers/identity";
import { BlockingFunction } from "../../v1/cloud-functions";
import { wrapTraceContext } from "../trace";
import { Expression } from "../../params";
import { initV2Endpoint } from "../../runtime/manifest";
import * as options from "../options";
import { SecretParam } from "../../params/types";
import { withInit } from "../../common/onInit";

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
}

/**
 * Handles an event that is triggered before a user is created.
 * @param handler - Event handler which is run every time before a user is created.
 */
export function beforeUserCreated(
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeCreateResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is created.
 * @param opts - Object containing function options.
 * @param handler - Event handler which is run every time before a user is created.
 */
export function beforeUserCreated(
  opts: BlockingOptions,
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeCreateResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is created.
 * @param optsOrHandler - Either an object containing function options, or an event handler (run before user creation).
 * @param handler? - If defined, an event handler which is run every time before a user is created.
 */
export function beforeUserCreated(
  optsOrHandler:
    | BlockingOptions
    | ((event: AuthBlockingEvent) => MaybeAsync<BeforeCreateResponse | void>),
  handler?: (event: AuthBlockingEvent) => MaybeAsync<BeforeCreateResponse | void>
): BlockingFunction {
  return beforeOperation("beforeCreate", optsOrHandler, handler);
}

/**
 * Handles an event that is triggered before a user is signed in.
 * @param handler - Event handler which is run every time before a user is signed in.
 */
export function beforeUserSignedIn(
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeSignInResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is signed in.
 * @param opts - Object containing function options.
 * @param handler - Event handler which is run every time before a user is signed in.
 */
export function beforeUserSignedIn(
  opts: BlockingOptions,
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeSignInResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before a user is signed in.
 * @param optsOrHandler - Either an object containing function options, or an event handler (run before user signin).
 * @param handler - Event handler which is run every time before a user is signed in.
 */
export function beforeUserSignedIn(
  optsOrHandler:
    | BlockingOptions
    | ((event: AuthBlockingEvent) => MaybeAsync<BeforeSignInResponse | void>),
  handler?: (event: AuthBlockingEvent) => MaybeAsync<BeforeSignInResponse | void>
): BlockingFunction {
  return beforeOperation("beforeSignIn", optsOrHandler, handler);
}

/**
 * Handles an event that is triggered before an email is sent to a user.
 * @param handler - Event handler that is run before an email is sent to a user.
 */
export function beforeEmailSent(
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeEmailResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before an email is sent to a user.
 * @param opts - Object containing function options.
 * @param handler - Event handler that is run before an email is sent to a user.
 */
export function beforeEmailSent(
  opts: Omit<BlockingOptions, "idToken" | "accessToken" | "refreshToken">,
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeEmailResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before an email is sent to a user.
 * @param optsOrHandler- Either an object containing function options, or an event handler that is run before an email is sent to a user.
 * @param handler - Event handler that is run before an email is sent to a user.
 */
export function beforeEmailSent(
  optsOrHandler:
    | Omit<BlockingOptions, "idToken" | "accessToken" | "refreshToken">
    | ((event: AuthBlockingEvent) => MaybeAsync<BeforeEmailResponse | void>),
  handler?: (event: AuthBlockingEvent) => MaybeAsync<BeforeEmailResponse | void>
): BlockingFunction {
  return beforeOperation("beforeSendEmail", optsOrHandler, handler);
}
/**
 * Handles an event that is triggered before an SMS is sent to a user.
 * @param handler - Event handler that is run before an SMS is sent to a user.
 */
export function beforeSmsSent(
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeSmsResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before an SMS is sent to a user.
 * @param opts - Object containing function options.
 * @param handler - Event handler that is run before an SMS is sent to a user.
 */
export function beforeSmsSent(
  opts: Omit<BlockingOptions, "idToken" | "accessToken" | "refreshToken">,
  handler: (event: AuthBlockingEvent) => MaybeAsync<BeforeSmsResponse | void>
): BlockingFunction;

/**
 * Handles an event that is triggered before an SMS is sent to a user.
 * @param optsOrHandler - Either an object containing function options, or an event handler that is run before an SMS is sent to a user.
 * @param handler - Event handler that is run before an SMS is sent to a user.
 */
export function beforeSmsSent(
  optsOrHandler:
    | Omit<BlockingOptions, "idToken" | "accessToken" | "refreshToken">
    | ((event: AuthBlockingEvent) => MaybeAsync<BeforeSmsResponse | void>),
  handler?: (event: AuthBlockingEvent) => MaybeAsync<BeforeSmsResponse | void>
): BlockingFunction {
  return beforeOperation("beforeSendSms", optsOrHandler, handler);
}

/** @hidden */
export function beforeOperation(
  eventType: AuthBlockingEventType,
  optsOrHandler:
    | BlockingOptions
    | ((
        event: AuthBlockingEvent
      ) => MaybeAsync<
        BeforeCreateResponse | BeforeSignInResponse | BeforeEmailResponse | BeforeSmsResponse | void
      >),
  handler: HandlerV2
): BlockingFunction {
  if (!handler || typeof optsOrHandler === "function") {
    handler = optsOrHandler as (
      event: AuthBlockingEvent
    ) => MaybeAsync<
      BeforeCreateResponse | BeforeSignInResponse | BeforeEmailResponse | BeforeSmsResponse | void
    >;
    optsOrHandler = {};
  }

  const { opts, ...blockingOptions } = getOpts(optsOrHandler);

  // Create our own function that just calls the provided function so we know for sure that
  // handler takes one argument. This is something common/providers/identity depends on.
  const annotatedHandler = Object.assign(handler, { platform: "gcfv2" as const });
  const func: any = wrapTraceContext(withInit(wrapHandler(eventType, annotatedHandler)));

  const legacyEventType = `providers/cloud.auth/eventTypes/user.${eventType}`;

  /** Endpoint */
  const baseOptsEndpoint = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOptsEndpoint = options.optionsToEndpoint(opts);
  func.__endpoint = {
    ...initV2Endpoint(options.getGlobalOptions(), opts),
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
        ...((eventType === "beforeCreate" || eventType === "beforeSignIn") && blockingOptions),
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
