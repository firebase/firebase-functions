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
import { copyIfPresent } from "../../common/encoding";
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
import { CloudEvent, CloudFunction } from "../core";
import { Expression } from "../../params";
import { initV2Endpoint, ManifestEndpoint } from "../../runtime/manifest";
import * as options from "../options";
import { SecretParam } from "../../params/types";
import { withInit } from "../../common/onInit";

export { AuthUserRecord, AuthBlockingEvent, HttpsError };

/**
 * The user data payload for an Auth event.
 */
export type User = AuthUserRecord;

/**
 * The event object passed to the handler function.
 */
export interface AuthEvent<T> extends CloudEvent<T> {
  /** The project identifier. */
  project: string;
  /** The ID of the Identity Platform tenant associated with the event, if applicable. */
  tenantId?: string;
}

/**
 * Options for configuring an auth trigger.
 */
export interface AuthOptions extends options.EventHandlerOptions {
  /**
   * The ID of the Identity Platform tenant to scope the function to.
   * If not set, the function triggers on users across all tenants.
   */
  tenantId?: string;

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
}


/**
 * All function options plus idToken, accessToken, and refreshToken.
 */
export interface BlockingOptions
  extends Omit<options.GlobalOptions, "enforceAppCheck" | "preserveExternalChanges" | "invoker"> {
  /** Pass the ID Token credential to the function. */
  idToken?: boolean;

  /** Pass the Access Token credential to the function. */
  accessToken?: boolean;

  /** Pass the Refresh Token credential to the function. */
  refreshToken?: boolean;
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

  func.__endpoint = makeBlockingEndpoint(eventType, opts, blockingOptions);

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
export function getOpts(blockingOptions: BlockingOptions): {
  opts: options.GlobalOptions;
  idToken: boolean;
  accessToken: boolean;
  refreshToken: boolean;
} {
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

/**
 * Event handler that triggers when a Firebase Auth user is created.
 *
 * @param handler - Event handler which is run every time a Firebase Auth user is created.
 * @returns A Cloud Function that you can export and deploy.
 *
 * @public
 */
export function onUserCreated(
  handler: (event: AuthEvent<User>) => any | Promise<any>
): CloudFunction<AuthEvent<User>>;

/**
 * Event handler that triggers when a Firebase Auth user is created.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firebase Auth user is created.
 * @returns A Cloud Function that you can export and deploy.
 *
 * @public
 */
export function onUserCreated(
  opts: AuthOptions,
  handler: (event: AuthEvent<User>) => any | Promise<any>
): CloudFunction<AuthEvent<User>>;

/**
 * Event handler that triggers when a Firebase Auth user is created.
 *
 * @param optsOrHandler - Options or an event handler.
 * @param handler - Event handler which is run every time a Firebase Auth user is created.
 * @returns A Cloud Function that you can export and deploy.
 *
 * @public
 */
export function onUserCreated(
  optsOrHandler: AuthOptions | ((event: AuthEvent<User>) => any | Promise<any>),
  handler?: (event: AuthEvent<User>) => any | Promise<any>
): CloudFunction<AuthEvent<User>> {
  let opts: AuthOptions;
  let func: (event: AuthEvent<User>) => any | Promise<any>;

  if (typeof optsOrHandler === "function") {
    opts = {};
    func = optsOrHandler;
  } else {
    opts = optsOrHandler;
    func = handler as (event: AuthEvent<User>) => any | Promise<any>;
  }

  return onOperation("google.firebase.auth.user.v2.created", opts, func);
}

/**
 * Event handler that triggers when a Firebase Auth user is deleted.
 *
 * @param handler - Event handler which is run every time a Firebase Auth user is deleted.
 * @returns A Cloud Function that you can export and deploy.
 *
 * @public
 */
export function onUserDeleted(
  handler: (event: AuthEvent<User>) => any | Promise<any>
): CloudFunction<AuthEvent<User>>;

/**
 * Event handler that triggers when a Firebase Auth user is deleted.
 *
 * @param opts - Options that can be set on an individual event-handling function.
 * @param handler - Event handler which is run every time a Firebase Auth user is deleted.
 * @returns A Cloud Function that you can export and deploy.
 *
 * @public
 */
export function onUserDeleted(
  opts: AuthOptions,
  handler: (event: AuthEvent<User>) => any | Promise<any>
): CloudFunction<AuthEvent<User>>;

/**
 * Event handler that triggers when a Firebase Auth user is deleted.
 *
 * @param optsOrHandler - Options or an event handler.
 * @param handler - Event handler which is run every time a Firebase Auth user is deleted.
 * @returns A Cloud Function that you can export and deploy.
 *
 * @public
 */
export function onUserDeleted(
  optsOrHandler: AuthOptions | ((event: AuthEvent<User>) => any | Promise<any>),
  handler?: (event: AuthEvent<User>) => any | Promise<any>
): CloudFunction<AuthEvent<User>> {
  let opts: AuthOptions;
  let func: (event: AuthEvent<User>) => any | Promise<any>;

  if (typeof optsOrHandler === "function") {
    opts = {};
    func = optsOrHandler;
  } else {
    opts = optsOrHandler;
    func = handler as (event: AuthEvent<User>) => any | Promise<any>;
  }

  return onOperation("google.firebase.auth.user.v2.deleted", opts, func);
}

/** @hidden */
function onOperation(
  eventType: string,
  opts: AuthOptions,
  handler: (event: AuthEvent<User>) => any | Promise<any>
): CloudFunction<AuthEvent<User>> {
  const func = (raw: CloudEvent<unknown>) => {
    if (raw.data && typeof raw.data === "object") {
      if ("value" in raw.data) {
        raw.data = (raw.data as any).value;
      } else if ("oldValue" in raw.data) {
        raw.data = (raw.data as any).oldValue;
      }
    }
    // Normalize the data to match AuthUserRecord
    const data = raw.data as any;
    if (data && data.metadata) {
      const creationTime = data.metadata.creationTime || data.metadata.createTime;
      if (creationTime) {
        data.metadata.creationTime = new Date(creationTime).toUTCString();
        delete data.metadata.createTime;
      }

      const lastSignInTime = data.metadata.lastSignInTime;
      if (lastSignInTime) {
        data.metadata.lastSignInTime = new Date(lastSignInTime).toUTCString();
      }
    }
    return wrapTraceContext(withInit(handler))(raw as AuthEvent<User>);
  };

  func.run = handler;

  func.__endpoint = makeEndpoint(eventType, opts);

  return func;
}

/** @hidden */
function makeEndpoint(eventType: string, opts: AuthOptions): ManifestEndpoint {
  const baseOpts = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOpts = options.optionsToEndpoint(opts);

  const eventFilters: Record<string, string> = {};
  if (opts.tenantId) {
    eventFilters.tenantId = opts.tenantId;
  }

  const endpoint: ManifestEndpoint = {
    ...initV2Endpoint(options.getGlobalOptions(), opts),
    platform: "gcfv2",
    ...baseOpts,
    ...specificOpts,
    labels: {
      ...baseOpts?.labels,
      ...specificOpts?.labels,
    },
    eventTrigger: {
      eventType,
      eventFilters,
      retry: false,
    },
  };
  copyIfPresent(endpoint.eventTrigger, opts, "retry", "retry");

  return endpoint;
}

/** @hidden */
function makeBlockingEndpoint(
  eventType: AuthBlockingEventType,
  opts: options.GlobalOptions,
  blockingOptions: { idToken: boolean; accessToken: boolean; refreshToken: boolean }
): ManifestEndpoint {
  const legacyEventType = `providers/cloud.auth/eventTypes/user.${eventType}`;

  const baseOptsEndpoint = options.optionsToEndpoint(options.getGlobalOptions());
  const specificOptsEndpoint = options.optionsToEndpoint(opts);

  return {
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
}
