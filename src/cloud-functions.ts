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
export { Request, Response };
const WILDCARD_REGEX = new RegExp('{[^/{}]*}', 'g');

/** An event to be handled in a developer's Cloud Function */
export interface Event<T> {
  eventId?: string;
  timestamp?: string;
  eventType?: string;
  resource?: string;
  params?: { [option: string]: any };
  data: T;

  /** @internal */
  auth?: apps.AuthMode;
}

/** TriggerAnnotated is used internally by the firebase CLI to understand what type of Cloud Function to deploy. */
export interface TriggerAnnotated {
  __trigger: {
    httpsTrigger?: {},
    eventTrigger?: {
      eventType: string;
      resource: string;
    }
  };
}

/**
 * An HttpsFunction is both an object that exports its trigger definitions at __trigger and
 * can be called as a function that takes an express.js Request and Response object.
 */
export type HttpsFunction = TriggerAnnotated & ((req: Request, resp: Response) => void);

/**
 * A CloudFunction is both an object that exports its trigger definitions at __trigger and
 * can be called as a function using the raw JS API for Google Cloud Functions.
 */
export type CloudFunction<T> = TriggerAnnotated & ((event: Event<any> | Event<T>) => PromiseLike<any> | any);

/** @internal */
export interface MakeCloudFunctionArgs<EventData> {
  provider: string;
  eventType: string;
  resource: string;
  dataConstructor?: (raw: Event<any>) => EventData;
  handler: (event?: Event<EventData>) => PromiseLike<any> | any;
  before?: (raw: Event<any>) => void;
  after?: (raw: Event<any>) => void;
}

function _makeParams(event: Event<any>, triggerResource: string): { [option: string]: any } {  
  if (!event.resource) {
    return event.params || {};
  }

  let wildcards = triggerResource.match(WILDCARD_REGEX);
  let params = {};
  if (wildcards) {
    let triggerResourceParts = _.split(triggerResource, '/');
    let eventResourceParts = _.split(event.resource, '/');
    _.forEach(wildcards, wildcard => {
      let wildcardNoBraces = wildcard.slice(1,-1);

      let position = _.indexOf(triggerResourceParts, wildcard);
      params[wildcardNoBraces] = eventResourceParts[position];
    });
  }

  return params;
};

/** @internal */
export function makeCloudFunction<EventData>({
  provider,
  eventType,
  resource,
  dataConstructor = (raw: Event<any>) => raw.data,
  handler,
  before,
  after,
}: MakeCloudFunctionArgs<EventData>): CloudFunction<EventData> {
  let cloudFunction: any = (event: Event<any>) => {
    return Promise.resolve(event)
      .then(before)
      .then(() => {
        let typedEvent: Event<EventData> = _.cloneDeep(event);
        typedEvent.data = dataConstructor(event);
        typedEvent.params = _makeParams(event, resource) || {};
        return handler(typedEvent);
      }).then(result => {
        if (after) { after(event); }
        return result;
      }, err => {
        if (after) { after(event); }
        return Promise.reject(err);
      });
  };
  cloudFunction.__trigger = {
    eventTrigger: {
      resource,
      eventType: `providers/${provider}/eventTypes/${eventType}`,
    },
  };

  return cloudFunction;
}
