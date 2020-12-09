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

import { Request, Response } from 'express';
import * as _ from 'lodash';
import { warn } from './logger';
import {
  DEFAULT_FAILURE_POLICY,
  DeploymentOptions,
  FailurePolicy,
  Schedule,
} from './function-configuration';
export { Request, Response };

/** @hidden */
const WILDCARD_REGEX = new RegExp('{[^/{}]*}', 'g');

/**
 * @hidden
 *
 * Wire format for an event.
 */
export interface Event {
  context: {
    eventId: string;
    timestamp: string;
    eventType: string;
    resource: Resource;
    domain?: string;
  };
  data: any;
}

/**
 * The context in which an event occurred.
 *
 * An EventContext describes:
 * - The time an event occurred.
 * - A unique identifier of the event.
 * - The resource on which the event occurred, if applicable.
 * - Authorization of the request that triggered the event, if applicable and
 *   available.
 */
export interface EventContext {
  /**
   * Authentication information for the user that triggered the function.
   * This object contains `uid` and `token` properties for authenticated users.
   * For more detail including token keys, see the
   * [security rules reference](/docs/firestore/reference/security/#properties).
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
   * The level of permissions for a user. Valid values are:
   *
   * * `ADMIN` Developer user or user authenticated via a service account.
   * * `USER` Known user.
   * * `UNAUTHENTICATED` Unauthenticated action
   * * `null` For event types that do not provide user information (all except
   *   Realtime Database).
   */
  authType?: 'ADMIN' | 'USER' | 'UNAUTHENTICATED';

  /**
   * The event’s unique identifier.
   */
  eventId: string;

  /**
   * Type of event. Possible values are:
   *
   * * `google.analytics.event.log`
   * * `google.firebase.auth.user.create`
   * * `google.firebase.auth.user.delete`
   * * `google.firebase.crashlytics.issue.new`
   * * `google.firebase.crashlytics.issue.regressed`
   * * `google.firebase.crashlytics.issue.velocityAlert`
   * * `google.firebase.database.ref.write`
   * * `google.firebase.database.ref.create`
   * * `google.firebase.database.ref.update`
   * * `google.firebase.database.ref.delete`
   * * `google.firestore.document.write`
   * * `google.firestore.document.create`
   * * `google.firestore.document.update`
   * * `google.firestore.document.delete`
   * * `google.pubsub.topic.publish`
   * * `google.firebase.remoteconfig.update`
   * * `google.storage.object.finalize`
   * * `google.storage.object.archive`
   * * `google.storage.object.delete`
   * * `google.storage.object.metadataUpdate`
   * * `google.testing.testMatrix.complete`
   */
  eventType: string;

  /**
   * An object containing the values of the wildcards in the `path` parameter
   * provided to the [`ref()`](providers_database_.html#ref) method for a Realtime
   * Database trigger. Cannot be accessed while inside the handler namespace.
   */
  params: { [option: string]: any };

  /**
   * The resource that emitted the event. Valid values are:
   *
   * * Analytics &mdash; `projects/<projectId>/events/<analyticsEventType>`
   * * Realtime Database &mdash;
       `projects/_/instances/<databaseInstance>/refs/<databasePath>`
   * * Storage &mdash;
      `projects/_/buckets/<bucketName>/objects/<fileName>#<generation>`
   * * Authentication &mdash; `projects/<projectId>`
   * * Pub/Sub &mdash; `projects/<projectId>/topics/<topicName>`
   *
   * Because Realtime Database instances and Cloud Storage buckets are globally
   * unique and not tied to the project, their resources start with `projects/_`.
   * Underscore is not a valid project name.
   */
  resource: Resource;
  /**
   * Timestamp for the event as an
   * [RFC 3339](https://www.ietf.org/rfc/rfc3339.txt) string.
   */
  timestamp: string;
}

/**
 * The Functions interface for events that change state, such as
 * Realtime Database or Cloud Firestore `onWrite` and `onUpdate`.
 *
 * For more information about the format used to construct `Change` objects, see
 * [`cloud-functions.ChangeJson`](/docs/reference/functions/cloud_functions_.changejson).
 *
 */
export class Change<T> {
  constructor(public before: T, public after: T) {}
}

/**
 * `ChangeJson` is the JSON format used to construct a Change object.
 */
export interface ChangeJson {
  /**
   * Key-value pairs representing state of data after the change.
   */
  after?: any;
  /**
   * Key-value pairs representing state of data before the change. If
   * `fieldMask` is set, then only fields that changed are present in `before`.
   */
  before?: any;
  /**
   * @hidden
   * Comma-separated string that represents names of fields that changed.
   */
  fieldMask?: string;
}

export namespace Change {
  /** @hidden */
  function reinterpretCast<T>(x: any) {
    return x as T;
  }

  /**
   * @hidden
   * Factory method for creating a Change from a `before` object and an `after`
   * object.
   */
  export function fromObjects<T>(before: T, after: T) {
    return new Change(before, after);
  }

  /**
   * @hidden
   * Factory method for creating a Change from a JSON and an optional customizer
   * function to be applied to both the `before` and the `after` fields.
   */
  export function fromJSON<T>(
    json: ChangeJson,
    customizer: (x: any) => T = reinterpretCast
  ): Change<T> {
    let before = _.assign({}, json.before);
    if (json.fieldMask) {
      before = applyFieldMask(before, json.after, json.fieldMask);
    }

    return Change.fromObjects(
      customizer(before || {}),
      customizer(json.after || {})
    );
  }

  /** @hidden */
  export function applyFieldMask(
    sparseBefore: any,
    after: any,
    fieldMask: string
  ) {
    const before = _.assign({}, after);
    const masks = fieldMask.split(',');

    masks.forEach((mask) => {
      const val = _.get(sparseBefore, mask);
      if (typeof val === 'undefined') {
        _.unset(before, mask);
      } else {
        _.set(before, mask, val);
      }
    });

    return before;
  }
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
 * @hidden
 * TriggerAnnotated is used internally by the firebase CLI to understand what
 * type of Cloud Function to deploy.
 */
export interface TriggerAnnotated {
  __trigger: {
    availableMemoryMb?: number;
    eventTrigger?: {
      eventType: string;
      resource: string;
      service: string;
    };
    failurePolicy?: FailurePolicy;
    httpsTrigger?: {};
    labels?: { [key: string]: string };
    regions?: string[];
    schedule?: Schedule;
    timeout?: string;
    vpcConnector?: string;
    vpcConnectorEgressSettings?: string;
    serviceAccountEmail?: string;
  };
}

/**
 * A Runnable has a `run` method which directly invokes the user-defined
 * function - useful for unit testing.
 */
export interface Runnable<T> {
  run: (data: T, context: any) => PromiseLike<any> | any;
}

/**
 * The Cloud Function type for HTTPS triggers. This should be exported from your
 * JavaScript file to define a Cloud Function.
 *
 * This type is a special JavaScript function which takes Express
 * [`Request`](https://expressjs.com/en/api.html#req) and
 * [`Response`](https://expressjs.com/en/api.html#res) objects as its only
 * arguments.
 */
export type HttpsFunction = TriggerAnnotated &
  ((req: Request, resp: Response) => void | Promise<void>);

/**
 * The Cloud Function type for all non-HTTPS triggers. This should be exported
 * from your JavaScript file to define a Cloud Function.
 *
 * This type is a special JavaScript function which takes a templated
 * `Event` object as its only argument.
 */
export type CloudFunction<T> = Runnable<T> &
  TriggerAnnotated &
  ((input: any, context?: any) => PromiseLike<any> | any);

/** @hidden */
export interface MakeCloudFunctionArgs<EventData> {
  after?: (raw: Event) => void;
  before?: (raw: Event) => void;
  contextOnlyHandler?: (context: EventContext) => PromiseLike<any> | any;
  dataConstructor?: (raw: Event) => EventData;
  eventType: string;
  handler?: (data: EventData, context: EventContext) => PromiseLike<any> | any;
  labels?: { [key: string]: any };
  legacyEventType?: string;
  options?: { [key: string]: any };
  /*
   * TODO: should remove `provider` and require a fully qualified `eventType`
   * once all providers have migrated to new format.
   */
  provider: string;
  service: string;
  triggerResource: () => string;
}

/** @hidden */
export function makeCloudFunction<EventData>({
  after = () => {},
  before = () => {},
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
      context.eventType = provider + '.' + eventType;
      context.resource = {
        service,
        name: context.resource,
      };
    }

    const event: Event = {
      data,
      context,
    };

    if (provider === 'google.firebase.database') {
      context.authType = _detectAuthType(event);
      if (context.authType !== 'ADMIN') {
        context.auth = _makeAuth(event, context.authType);
      } else {
        delete context.auth;
      }
    }

    if (triggerResource() == null) {
      Object.defineProperty(context, 'params', {
        get: () => {
          throw new Error(
            'context.params is not available when using the handler namespace.'
          );
        },
      });
    } else {
      context.params = context.params || _makeParams(context, triggerResource);
    }

    before(event);

    let promise;
    if (labels && labels['deployment-scheduled']) {
      // Scheduled function do not have meaningful data, so exclude it
      promise = contextOnlyHandler(context);
    } else {
      const dataOrChange = dataConstructor(event);
      promise = handler(dataOrChange, context);
    }
    if (typeof promise === 'undefined') {
      warn('Function returned undefined, expected Promise or value');
    }
    return Promise.resolve(promise)
      .then((result) => {
        after(event);
        return result;
      })
      .catch((err) => {
        after(event);
        return Promise.reject(err);
      });
  };

  Object.defineProperty(cloudFunction, '__trigger', {
    get: () => {
      if (triggerResource() == null) {
        return {};
      }

      const trigger: any = _.assign(optionsToTrigger(options), {
        eventTrigger: {
          resource: triggerResource(),
          eventType: legacyEventType || provider + '.' + eventType,
          service,
        },
      });
      if (!_.isEmpty(labels)) {
        trigger.labels = labels;
      }
      return trigger;
    },
  });

  cloudFunction.run = handler || contextOnlyHandler;
  return cloudFunction;
}

/** @hidden */
function _makeParams(
  context: EventContext,
  triggerResourceGetter: () => string
): { [option: string]: any } {
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
  if (wildcards) {
    const triggerResourceParts = _.split(triggerResource, '/');
    const eventResourceParts = _.split(context.resource.name, '/');
    _.forEach(wildcards, (wildcard) => {
      const wildcardNoBraces = wildcard.slice(1, -1);
      const position = _.indexOf(triggerResourceParts, wildcard);
      params[wildcardNoBraces] = eventResourceParts[position];
    });
  }
  return params;
}

/** @hidden */
function _makeAuth(event: Event, authType: string) {
  if (authType === 'UNAUTHENTICATED') {
    return null;
  }
  return {
    uid: _.get(event, 'context.auth.variable.uid'),
    token: _.get(event, 'context.auth.variable.token'),
  };
}

/** @hidden */
function _detectAuthType(event: Event) {
  if (_.get(event, 'context.auth.admin')) {
    return 'ADMIN';
  }
  if (_.has(event, 'context.auth.variable')) {
    return 'USER';
  }
  return 'UNAUTHENTICATED';
}

/** @hidden */
export function optionsToTrigger(options: DeploymentOptions) {
  const trigger: any = {};
  if (options.regions) {
    trigger.regions = options.regions;
  }
  if (options.failurePolicy !== undefined) {
    switch (options.failurePolicy) {
      case false:
        trigger.failurePolicy = undefined;
        break;
      case true:
        trigger.failurePolicy = DEFAULT_FAILURE_POLICY;
        break;
      default:
        trigger.failurePolicy = options.failurePolicy;
    }
  }
  if (options.timeoutSeconds) {
    trigger.timeout = options.timeoutSeconds.toString() + 's';
  }
  if (options.memory) {
    const memoryLookup = {
      '128MB': 128,
      '256MB': 256,
      '512MB': 512,
      '1GB': 1024,
      '2GB': 2048,
    };
    trigger.availableMemoryMb = _.get(memoryLookup, options.memory);
  }
  if (options.schedule) {
    trigger.schedule = options.schedule;
  }

  if (options.maxInstances) {
    trigger.maxInstances = options.maxInstances;
  }

  if (options.vpcConnector) {
    trigger.vpcConnector = options.vpcConnector;
  }

  if (options.vpcConnectorEgressSettings) {
    trigger.vpcConnectorEgressSettings = options.vpcConnectorEgressSettings;
  }

  if (options.serviceAccount) {
    if (options.serviceAccount === 'default') {
      // Do nothing, since this is equivalent to not setting serviceAccount.
    } else if (options.serviceAccount.endsWith('@')) {
      if (!process.env.GCLOUD_PROJECT) {
        throw new Error(
          `Unable to determine email for service account '${options.serviceAccount}' because process.env.GCLOUD_PROJECT is not set.`
        );
      }
      trigger.serviceAccountEmail = `${options.serviceAccount}${process.env.GCLOUD_PROJECT}.iam.gserviceaccount.com`;
    } else if (options.serviceAccount.includes('@')) {
      trigger.serviceAccountEmail = options.serviceAccount;
    } else {
      throw new Error(
        `Invalid option for serviceAccount: '${options.serviceAccount}'. Valid options are 'default', a service account email, or '{serviceAccountName}@'`
      );
    }
  }

  return trigger;
}
