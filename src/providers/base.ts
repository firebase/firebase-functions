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

import { env } from '../env';
import { Event, RawEvent } from '../event';

// We export a type that uses RawEvent so it must itself be exported from this module.
export { RawEvent } from '../event';

export interface TriggerAnnotated {
  __trigger: Trigger;
}

export interface EventTrigger {
  eventType: string;
  resource: string;
}
export interface Trigger {
  httpsTrigger?: Object;
  eventTrigger?: EventTrigger;
}

/* A CloudFunction is both an object that exports its trigger definitions at __trigger and
   can be called as a function using the raw JS API for Google Cloud Functions. */
export type CloudFunction = TriggerAnnotated & ((event: RawEvent) => PromiseLike<any> | any);

/** @internal */
export interface MakeCloudFunctionArgs<EventData> {
  provider: string;
  eventType: string;
  resource: string;
  dataConstructor?: (raw: RawEvent) => EventData;
  handler: (event?: Event<EventData>) => PromiseLike<any> | any;
  before?: (raw: RawEvent) => void;
  after?: (raw: RawEvent) => void;
}

/** @internal */
export function makeCloudFunction<EventData>({
  provider,
  eventType,
  resource,
  dataConstructor = (raw: RawEvent) => raw.data,
  handler,
  before,
  after,
}: MakeCloudFunctionArgs<EventData>): CloudFunction {
  let cloudFunction: any = (payload) => {
    return env().ready().then(before).then(() => {
      let data = dataConstructor(payload);
      let event = new Event(payload, data);
      return handler(event);
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
