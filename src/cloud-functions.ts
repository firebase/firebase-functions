// The MIT License (MIT)
//
// Copyright (c) 2015 Firebase
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

import { env } from './env';
import { apps } from './apps';
import * as _ from 'lodash';

/** An event to be handled in a developer's Cloud Function */
export interface Event<T> {
  eventId?: string;
  timestamp?: string;
  eventType?: string;
  resource?: string;
  path?: string;
  params?: {[option: string]: any};
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
    return env().ready().then(before).then(() => {
      let typedEvent: Event<EventData> = _.assign({}, event);
      // TODO(inlined) can we avoid the data constructor if we already have the right type?
      typedEvent.data = dataConstructor(event);
      typedEvent.params = event.params || {};
      return handler(typedEvent);
    }).then(after, after);
  };
  cloudFunction.__trigger = {
    eventTrigger: {
      resource,
      eventType: `providers/${provider}/eventTypes/${eventType}`,
    },
  };

  return cloudFunction;
}
