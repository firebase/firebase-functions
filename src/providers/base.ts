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
