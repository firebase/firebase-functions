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

import { apps } from './apps';
import * as _ from 'lodash';
import { Request, Response } from 'express';
import { DeploymentOptions } from './function-builder';
export { Request, Response };

const WILDCARD_REGEX = new RegExp('{[^/{}]*}', 'g');

/** Legacy wire format for an event
 * @internal
 */
export interface LegacyEvent {
  data: any;
  eventType?: string;
  resource?: string;
  eventId?: string;
  timestamp?: string;
  params?: { [option: string]: any };
  auth?: apps.AuthMode;
}

/** Wire format for an event
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

/** The context in which an event occurred.
 * An EventContext describes:
 * - The time an event occurred.
 * - A unique identifier of the event.
 * - The resource on which the event occurred, if applicable.
 * - Authorization of the request that triggered the event, if applicable and available.
 */
export interface EventContext {
  /** ID of the event */
  eventId: string;
  /** Timestamp for when the event occured (ISO string) */
  timestamp: string;
  /** Type of event */
  eventType: string;
  /** Resource that triggered the event */
  resource: Resource;
  /** Key-value pairs that represent the values of wildcards in a database reference */
  params: { [option: string]: any }; // added by SDK, but may be {}
  /** Type of authentication for the triggering action, valid value are: 'ADMIN', 'USER',
   * 'UNAUTHENTICATED'. Only available for database functions.
   */
  authType?: 'ADMIN' | 'USER' | 'UNAUTHENTICATED';
  /** Firebase auth variable for the user whose action triggered the function. Field will be
   * null for unauthenticated users, and will not exist for admin users. Only available
   * for database functions.
   */
  auth?: {
    uid: string;
    token: object;
  };
}

/** Change describes a change of state - "before" represents the state prior
 * to the event, "after" represents the state after the event.
 */
export class Change<T> {
  constructor(public before?: T, public after?: T) {}
}

/** ChangeJson is the JSON format used to construct a Change object. */
export interface ChangeJson {
  /** Key-value pairs representing state of data before the change.
   * If `fieldMask` is set, then only fields that changed are present in `before`.
   */
  before?: any;
  /** Key-value pairs representing state of data after the change. */
  after?: any;
  /** Comma-separated string that represents names of field that changed. */
  fieldMask?: string;
}

export namespace Change {
  function reinterpretCast<T>(x: any) {
    return x as T;
  }

  /** Factory method for creating a Change from a `before` object and an `after` object. */
  export function fromObjects<T>(before: T, after: T) {
    return new Change(before, after);
  }

  /** Factory method for creating a Change from a JSON and an optional customizer function to be
   * applied to both the `before` and the `after` fields.
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

  /** @internal */
  export function applyFieldMask(
    sparseBefore: any,
    after: any,
    fieldMask: string
  ) {
    let before = _.assign({}, after);
    let masks = fieldMask.split(',');
    _.forEach(masks, mask => {
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

/** Resource is a standard format for defining a resource (google.rpc.context.AttributeContext.Resource).
 * In Cloud Functions, it is the resource that triggered the function - such as a storage bucket.
 */
export interface Resource {
  service: string;
  name: string;
  type?: string;
  labels?: { [tag: string]: string };
}

/** TriggerAnnotated is used internally by the firebase CLI to understand what type of Cloud Function to deploy. */
export interface TriggerAnnotated {
  __trigger: {
    httpsTrigger?: {};
    eventTrigger?: {
      eventType: string;
      failurePolicy?: object;
      resource: string;
      service: string;
    };
    labels?: { [key: string]: string };
    regions?: string[];
    timeout?: string;
    availableMemoryMb?: number;
  };
}

/** A Runnable has a `run` method which directly invokes the user-defined function - useful for unit testing. */
export interface Runnable<T> {
  run: (data: T, context: any) => PromiseLike<any> | any;
}

/**
 * An HttpsFunction is both an object that exports its trigger definitions at __trigger and
 * can be called as a function that takes an express.js Request and Response object.
 */
export type HttpsFunction = TriggerAnnotated &
  ((req: Request, resp: Response) => void);

/**
 * A CloudFunction is both an object that exports its trigger definitions at __trigger and
 * can be called as a function using the raw JS API for Google Cloud Functions.
 */
export type CloudFunction<T> = Runnable<T> &
  TriggerAnnotated &
  ((input: any, context?: any) => PromiseLike<any> | any);

/** @internal */
export interface MakeCloudFunctionArgs<EventData> {
  // TODO should remove `provider` and require a fully qualified `eventType`
  // once all providers have migrated to new format.
  provider: string;
  eventType: string;
  triggerResource: () => string;
  service: string;
  dataConstructor?: (raw: Event) => EventData;
  handler: (data: EventData, context: EventContext) => PromiseLike<any> | any;
  before?: (raw: Event) => void;
  after?: (raw: Event) => void;
  legacyEventType?: string;
  opts?: { [key: string]: any };
}

/** @internal */
export function makeCloudFunction<EventData>({
  provider,
  eventType,
  triggerResource,
  service,
  dataConstructor = (raw: Event) => raw.data,
  handler,
  before = () => {
    return;
  },
  after = () => {
    return;
  },
  legacyEventType,
  opts = {},
}: MakeCloudFunctionArgs<EventData>): CloudFunction<EventData> {
  let cloudFunction;

  let cloudFunctionNewSignature: any = (data: any, context: any) => {
    if (legacyEventType && context.eventType === legacyEventType) {
      // v1beta1 event flow has different format for context, transform them to new format.
      context.eventType = provider + '.' + eventType;
      context.resource = {
        service: service,
        name: context.resource,
      };
    }

    let event: Event = {
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
    context.params = context.params || _makeParams(context, triggerResource);

    before(event);

    let dataOrChange = dataConstructor(event);
    let promise = handler(dataOrChange, context);
    if (typeof promise === 'undefined') {
      console.warn('Function returned undefined, expected Promise or value');
    }
    return Promise.resolve(promise)
      .then(result => {
        after(event);
        return result;
      })
      .catch(err => {
        after(event);
        return Promise.reject(err);
      });
  };

  if (process.env.X_GOOGLE_NEW_FUNCTION_SIGNATURE === 'true') {
    cloudFunction = cloudFunctionNewSignature;
  } else {
    cloudFunction = (raw: Event | LegacyEvent) => {
      let context;
      // In Node 6 runtime, function called with single event param
      let data = _.get(raw, 'data');
      if (isEvent(raw)) {
        // new eventflow v1beta2 format
        context = _.cloneDeep(raw.context);
      } else {
        // eventflow v1beta1 format
        context = _.omit(raw, 'data');
      }
      return cloudFunctionNewSignature(data, context);
    };
  }

  Object.defineProperty(cloudFunction, '__trigger', {
    get: () => {
      let trigger: any = _.assign(optsToTrigger(opts), {
        eventTrigger: {
          resource: triggerResource(),
          eventType: legacyEventType || provider + '.' + eventType,
          service,
        },
      });
      if (opts.retry) {
        trigger.eventTrigger.failurePolicy = { retry: {} };
      }
      return trigger;
    },
  });

  cloudFunction.run = handler;
  return cloudFunction;
}

function isEvent(event: Event | LegacyEvent): event is Event {
  return _.has(event, 'context');
}

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
  let triggerResource = triggerResourceGetter();
  let wildcards = triggerResource.match(WILDCARD_REGEX);
  let params: { [option: string]: any } = {};
  if (wildcards) {
    let triggerResourceParts = _.split(triggerResource, '/');
    let eventResourceParts = _.split(context.resource.name, '/');
    _.forEach(wildcards, wildcard => {
      let wildcardNoBraces = wildcard.slice(1, -1);
      let position = _.indexOf(triggerResourceParts, wildcard);
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

export function optsToTrigger(opts: DeploymentOptions) {
  let trigger: any = {};
  if (opts.regions) {
    trigger.regions = opts.regions;
  }
  if (opts.timeoutSeconds) {
    trigger.timeout = opts.timeoutSeconds.toString() + 's';
  }
  if (opts.memory) {
    const memoryLookup = {
      '128MB': 128,
      '256MB': 256,
      '512MB': 512,
      '1GB': 1024,
      '2GB': 2048,
    };
    trigger.availableMemoryMb = _.get(memoryLookup, opts.memory);
  }
  return trigger;
}
