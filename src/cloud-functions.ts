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
import { apps } from './apps';
import { DeploymentOptions, Schedule } from './function-configuration';
export { Request, Response };

const WILDCARD_REGEX = new RegExp('{[^/{}]*}', 'g');

/**
 * Wire format for an event.
 * @internal
 */
export interface Event {
  context: {
    eventId: string;
    timestamp: string;
    eventType: string;
    resource: Resource;
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
   * Firebase auth variable for the user whose action triggered the function.
   * Field will be null for unauthenticated users, and will not exist for admin
   * users. Only available for database functions.
   */
  auth?: {
    token: object;
    uid: string;
  };
  /**
   * Type of authentication for the triggering action. Only available for
   * database functions.
   */
  authType?: 'ADMIN' | 'USER' | 'UNAUTHENTICATED';
  /**
   * ID of the event
   */
  eventId: string;
  /**
   * Type of event
   */
  eventType: string;
  /**
   * Key-value pairs that represent the values of wildcards in a database
   * reference. Cannot be accessed while inside the handler namespace.
   */
  params: { [option: string]: any };
  /**
   * Resource that triggered the event
   */
  resource: Resource;
  /**
   * Timestamp for when the event ocurred (ISO 8601 string)
   */
  timestamp: string;
}

/**
 * Change describes a change of state - "before" represents the state prior to
 * the event, "after" represents the state after the event.
 */
export class Change<T> {
  constructor(public before: T, public after: T) {}
}

/**
 * ChangeJson is the JSON format used to construct a Change object.
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
   * Comma-separated string that represents names of field that changed.
   */
  fieldMask?: string;
}

export namespace Change {
  function reinterpretCast<T>(x: any) {
    return x as T;
  }

  /**
   * Factory method for creating a Change from a `before` object and an `after`
   * object.
   */
  export function fromObjects<T>(before: T, after: T) {
    return new Change(before, after);
  }

  /**
   * Factory method for creating a Change from a JSON and an optional customizer
   * function to be applied to both the `before` and the `after` fields.
   */
  export function fromJSON<T>(
    json: ChangeJson,
    customizer: (x: any) => T = reinterpretCast,
  ): Change<T> {
    let before = _.assign({}, json.before);
    if (json.fieldMask) {
      before = applyFieldMask(before, json.after, json.fieldMask);
    }
    return Change.fromObjects(
      customizer(before || {}),
      customizer(json.after || {}),
    );
  }

  /**
   * @internal
   */
  export function applyFieldMask(
    sparseBefore: any,
    after: any,
    fieldMask: string,
  ) {
    const before = _.assign({}, after);
    const masks = fieldMask.split(',');
    _.forEach(masks, (mask) => {
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
    httpsTrigger?: {};
    labels?: { [key: string]: string };
    regions?: string[];
    schedule?: Schedule;
    timeout?: string;
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
 * An HttpsFunction is both an object that exports its trigger definitions at
 * __trigger and can be called as a function that takes an express.js Request
 * and Response object.
 */
export type HttpsFunction = TriggerAnnotated &
  ((req: Request, resp: Response) => void);

/**
 * A CloudFunction is both an object that exports its trigger definitions at
 * __trigger and can be called as a function using the raw JS API for Google
 * Cloud Functions.
 */
export type CloudFunction<T> = Runnable<T> &
  TriggerAnnotated &
  ((input: any, context?: any) => PromiseLike<any> | any);

/**
 * @internal
 */
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

/**
 * @internal
 */
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
            'context.params is not available when using the handler namespace.',
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
      console.warn('Function returned undefined, expected Promise or value');
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

function _makeParams(
  context: EventContext,
  triggerResourceGetter: () => string,
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

function _makeAuth(event: Event, authType: string) {
  if (authType === 'UNAUTHENTICATED') {
    return null;
  }
  return {
    uid: _.get(event, 'context.auth.variable.uid'),
    token: _.get(event, 'context.auth.variable.token'),
  };
}

function _detectAuthType(event: Event) {
  if (_.get(event, 'context.auth.admin')) {
    return 'ADMIN';
  }
  if (_.has(event, 'context.auth.variable')) {
    return 'USER';
  }
  return 'UNAUTHENTICATED';
}

export function optionsToTrigger(options: DeploymentOptions) {
  const trigger: any = {};
  if (options.regions) {
    trigger.regions = options.regions;
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
  return trigger;
}
