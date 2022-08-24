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

import { Request, Response } from "express";
import { warn } from "../logger";
import { DeploymentOptions } from "./function-configuration";
export { Request, Response };
import { convertIfPresent, copyIfPresent } from "../common/encoding";
import { ManifestEndpoint, ManifestRequiredAPI } from "../runtime/manifest";

export { Change } from "../common/change";

/** @internal */
const WILDCARD_REGEX = new RegExp("{[^/{}]*}", "g");

/**
 * Wire format for an event.
 */
export interface Event {
  /**
   * Wire format for an event context.
   */
  context: {
    eventId: string;
    timestamp: string;
    eventType: string;
    resource: Resource;
    domain?: string;
    auth?: {
      variable?: {
        uid?: string;
        token?: string;
      };
      admin: boolean;
    };
  };
  /**
   * Event data over wire.
   */
  data: any;
}

/**
 * The context in which an event occurred.
 *
 * @remarks
 * An EventContext describes:
 * - The time an event occurred.
 * - A unique identifier of the event.
 * - The resource on which the event occurred, if applicable.
 * - Authorization of the request that triggered the event, if applicable and
 *   available.
 */
export interface EventContext<Params = Record<string, string>> {
  /**
   * Authentication information for the user that triggered the function.
   *
   * @remarks
   * This object contains `uid` and `token` properties for authenticated users.
   * For more detail including token keys, see the
   * {@link https://firebase.google.com/docs/reference/rules/rules#properties | security rules reference}.
   *
   * This field is only populated for Realtime Database triggers and Callable
   * functions. For an unauthenticated user, this field is null. For Firebase
   * admin users and event types that do not provide user information, this field
   * does not exist.
   */
  auth?: {
    token: object;
    uid: string;
  };

  /**
   * The level of permissions for a user.
   *
   * @remarks
   * Valid values are:
   *
   * - `ADMIN`: Developer user or user authenticated via a service account.
   *
   * - `USER`: Known user.
   *
   * - `UNAUTHENTICATED`: Unauthenticated action
   *
   * - `null`: For event types that do not provide user information (all except
   *   Realtime Database).
   */
  authType?: "ADMIN" | "USER" | "UNAUTHENTICATED";

  /**
   * The event’s unique identifier.
   */
  eventId: string;

  /**
   * Type of event.
   *
   * @remarks
   * Possible values are:
   *
   * - `google.analytics.event.log`
   *
   * - `google.firebase.auth.user.create`
   *
   * - `google.firebase.auth.user.delete`
   *
   * - `google.firebase.database.ref.write`
   *
   * - `google.firebase.database.ref.create`
   *
   * - `google.firebase.database.ref.update`
   *
   * - `google.firebase.database.ref.delete`
   *
   * - `google.firestore.document.write`
   *
   * - `google.firestore.document.create`
   *
   * - `google.firestore.document.update`
   *
   * - `google.firestore.document.delete`
   *
   * - `google.pubsub.topic.publish`
   *
   * - `google.firebase.remoteconfig.update`
   *
   * - `google.storage.object.finalize`
   *
   * - `google.storage.object.archive`
   *
   * - `google.storage.object.delete`
   *
   * - `google.storage.object.metadataUpdate`
   *
   * - `google.testing.testMatrix.complete`
   */
  eventType: string;

  /**
   * An object containing the values of the wildcards in the `path` parameter
   * provided to the {@link fireabase-functions.v1.database#ref | `ref()`} method for a Realtime Database trigger.
   */
  params: Params;

  /**
   * The resource that emitted the event.
   *
   * @remarks
   * Valid values are:
   *
   * Analytics: `projects/<projectId>/events/<analyticsEventType>`
   *
   * Realtime Database: `projects/_/instances/<databaseInstance>/refs/<databasePath>`
   *
   * Storage: `projects/_/buckets/<bucketName>/objects/<fileName>#<generation>`
   *
   * Authentication: `projects/<projectId>`
   *
   * Pub/Sub: `projects/<projectId>/topics/<topicName>`
   *
   * Because Realtime Database instances and Cloud Storage buckets are globally
   * unique and not tied to the project, their resources start with `projects/_`.
   * Underscore is not a valid project name.
   */
  resource: Resource;
  /**
   * Timestamp for the event as an {@link https://www.ietf.org/rfc/rfc3339.txt | RFC 3339} string.
   */
  timestamp: string;
}

/**
 * Resource is a standard format for defining a resource
 * (google.rpc.context.AttributeContext.Resource). In Cloud Functions, it is the
 * resource that triggered the function - such as a storage bucket.
 */
export interface Resource {
  service: string;
  name: string;
  type?: string;
  labels?: { [tag: string]: string };
}

/**
 * A Runnable has a `run` method which directly invokes the user-defined
 * function - useful for unit testing.
 */
export interface Runnable<T> {
  /** Directly invoke the user defined function. */
  run: (data: T, context: any) => PromiseLike<any> | any;
}

/**
 * The Cloud Function type for HTTPS triggers. This should be exported from your
 * JavaScript file to define a Cloud Function.
 *
 * @remarks
 * This type is a special JavaScript function which takes Express
 * {@link https://expressjs.com/en/api.html#req | `Request` } and
 * {@link https://expressjs.com/en/api.html#res | `Response` } objects as its only
 * arguments.
 */
export interface HttpsFunction {
  (req: Request, resp: Response): void | Promise<void>;

  /** @internal */
  __endpoint: ManifestEndpoint;

  /** @internal */
  __requiredAPIs?: ManifestRequiredAPI[];
}

/**
 * The Cloud Function type for Blocking triggers.
 */
export interface BlockingFunction {
  (req: Request, resp: Response): void | Promise<void>;

  /** @internal */
  __endpoint: ManifestEndpoint;

  /** @internal */
  __requiredAPIs?: ManifestRequiredAPI[];
}

/**
 * The Cloud Function type for all non-HTTPS triggers. This should be exported
 * from your JavaScript file to define a Cloud Function.
 *
 * This type is a special JavaScript function which takes a templated
 * `Event` object as its only argument.
 */
export interface CloudFunction<T> extends Runnable<T> {
  (input: any, context?: any): PromiseLike<any> | any;

  /** @internal */
  __endpoint: ManifestEndpoint;

  /** @internal */
  __requiredAPIs?: ManifestRequiredAPI[];
}

/** @internal */
export interface MakeCloudFunctionArgs<EventData> {
  after?: (raw: Event) => void;
  before?: (raw: Event) => void;
  contextOnlyHandler?: (context: EventContext) => PromiseLike<any> | any;
  dataConstructor?: (raw: Event) => EventData;
  eventType: string;
  handler?: (data: EventData, context: EventContext) => PromiseLike<any> | any;
  labels?: Record<string, string>;
  legacyEventType?: string;
  options?: DeploymentOptions;
  /*
   * TODO: should remove `provider` and require a fully qualified `eventType`
   * once all providers have migrated to new format.
   */
  provider: string;
  service: string;
  triggerResource: () => string;
}

/** @internal */
export function makeCloudFunction<EventData>({
  contextOnlyHandler,
  dataConstructor = (raw: Event) => raw.data,
  eventType,
  handler,
  labels = {},
  legacyEventType,
  options = {},
  provider,
  service,
  triggerResource,
}: MakeCloudFunctionArgs<EventData>): CloudFunction<EventData> {
  const cloudFunction: any = (data: any, context: any) => {
    if (legacyEventType && context.eventType === legacyEventType) {
      /*
       * v1beta1 event flow has different format for context, transform them to
       * new format.
       */
      context.eventType = provider + "." + eventType;
      context.resource = {
        service,
        name: context.resource,
      };
    }

    const event: Event = {
      data,
      context,
    };

    if (provider === "google.firebase.database") {
      context.authType = _detectAuthType(event);
      if (context.authType !== "ADMIN") {
        context.auth = _makeAuth(event, context.authType);
      } else {
        delete context.auth;
      }
    }

    if (triggerResource() == null) {
      Object.defineProperty(context, "params", {
        get: () => {
          throw new Error("context.params is not available when using the handler namespace.");
        },
      });
    } else {
      context.params = context.params || _makeParams(context, triggerResource);
    }

    let promise;
    if (labels && labels["deployment-scheduled"]) {
      // Scheduled function do not have meaningful data, so exclude it
      promise = contextOnlyHandler(context);
    } else {
      const dataOrChange = dataConstructor(event);
      promise = handler(dataOrChange, context);
    }
    if (typeof promise === "undefined") {
      warn("Function returned undefined, expected Promise or value");
    }
    return Promise.resolve(promise);
  };

  Object.defineProperty(cloudFunction, "__endpoint", {
    get: () => {
      if (triggerResource() == null) {
        return undefined;
      }

      const endpoint: ManifestEndpoint = {
        platform: "gcfv1",
        ...optionsToEndpoint(options),
      };

      if (options.schedule) {
        endpoint.scheduleTrigger = options.schedule;
      } else {
        endpoint.eventTrigger = {
          eventType: legacyEventType || provider + "." + eventType,
          eventFilters: {
            resource: triggerResource(),
          },
          retry: !!options.failurePolicy,
        };
      }

      // Note: We intentionally don't make use of labels args here.
      // labels is used to pass SDK-defined labels to the trigger, which isn't
      // something we will do in the container contract world.
      endpoint.labels = { ...endpoint.labels };

      return endpoint;
    },
  });

  if (options.schedule) {
    cloudFunction.__requiredAPIs = [
      {
        api: "cloudscheduler.googleapis.com",
        reason: "Needed for scheduled functions.",
      },
    ];
  }

  cloudFunction.run = handler || contextOnlyHandler;
  return cloudFunction;
}

function _makeParams(
  context: EventContext,
  triggerResourceGetter: () => string
): Record<string, string> {
  if (context.params) {
    // In unit testing, user may directly provide `context.params`.
    return context.params;
  }
  if (!context.resource) {
    // In unit testing, `resource` may be unpopulated for a test event.
    return {};
  }
  const triggerResource = triggerResourceGetter();
  const wildcards = triggerResource.match(WILDCARD_REGEX);
  const params: { [option: string]: any } = {};

  // Note: some tests don't set context.resource.name
  const eventResourceParts = context?.resource?.name?.split?.("/");
  if (wildcards && eventResourceParts) {
    const triggerResourceParts = triggerResource.split("/");
    for (const wildcard of wildcards) {
      const wildcardNoBraces = wildcard.slice(1, -1);
      const position = triggerResourceParts.indexOf(wildcard);
      params[wildcardNoBraces] = eventResourceParts[position];
    }
  }
  return params;
}

function _makeAuth(event: Event, authType: string) {
  if (authType === "UNAUTHENTICATED") {
    return null;
  }
  return {
    uid: event.context?.auth?.variable?.uid,
    token: event.context?.auth?.variable?.token,
  };
}

function _detectAuthType(event: Event) {
  if (event.context?.auth?.admin) {
    return "ADMIN";
  }
  if (event.context?.auth?.variable) {
    return "USER";
  }
  return "UNAUTHENTICATED";
}

/** @internal */
export function optionsToEndpoint(options: DeploymentOptions): ManifestEndpoint {
  const endpoint: ManifestEndpoint = {};
  copyIfPresent(
    endpoint,
    options,
    "minInstances",
    "maxInstances",
    "ingressSettings",
    "labels",
    "timeoutSeconds"
  );
  convertIfPresent(endpoint, options, "region", "regions");
  convertIfPresent(endpoint, options, "serviceAccountEmail", "serviceAccount", (sa) => sa);
  convertIfPresent(endpoint, options, "secretEnvironmentVariables", "secrets", (secrets) =>
    secrets.map((secret) => ({ key: secret }))
  );
  if (options?.vpcConnector) {
    endpoint.vpc = { connector: options.vpcConnector };
    convertIfPresent(endpoint.vpc, options, "egressSettings", "vpcConnectorEgressSettings");
  }
  convertIfPresent(endpoint, options, "availableMemoryMb", "memory", (mem) => {
    const memoryLookup = {
      "128MB": 128,
      "256MB": 256,
      "512MB": 512,
      "1GB": 1024,
      "2GB": 2048,
      "4GB": 4096,
      "8GB": 8192,
    };
    return memoryLookup[mem];
  });
  return endpoint;
}
