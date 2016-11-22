import * as _ from 'lodash';

import { FirebaseEnv } from './env';
import { FirebaseEventMetadata, Event, RawEvent } from './event';

export interface TriggerAnnotated {
  __trigger: TriggerDefinition;
}

export interface TriggerDefinition {
  service: string;
  event: string;
}

export class FunctionBuilder {
  protected _env: FirebaseEnv;

  constructor(env: FirebaseEnv) {
    this._env = env;
  }

  protected _isEventNewFormat(event: {action?: string}): boolean {
    return /sources\/[^/]+\/actions\/[^/]+/.test(event.action);
  }

  protected _toTrigger(event?: string): TriggerDefinition {
    throw new Error('Unimplemented _toTrigger');
  }

  protected _wrapHandler<EventData, OldRawType>(
    handler: (event: Event<EventData>) => PromiseLike<any> | any,
    event: string,
    additionalMeta?: FirebaseEventMetadata,
  ): TriggerAnnotated & ((raw: OldRawType | RawEvent) => PromiseLike<any> | any) {
    const wrapped: any = (payload: OldRawType | RawEvent) => {
      const metadata = <FirebaseEventMetadata>_.extend({}, additionalMeta, payload);
      return handler(new Event(metadata, this._dataConstructor<EventData, OldRawType>(payload)));
    };

    return this._makeHandler<EventData>(wrapped, event);
  }

  protected _makeHandler<EventData>(
    fn: (event: Event<EventData>) => PromiseLike<any> | any,
    event: string,
  ): TriggerAnnotated & ((raw: RawEvent) => PromiseLike<any> | any) {
    let handler: any = (payload) => {
      return this._env.ready().then(function() {
        return fn(payload);
      });
    };
    handler.__trigger = this._toTrigger(event);

    return handler;
  }

  protected _dataConstructor<EventData, OldRawType>(raw: OldRawType | RawEvent): EventData {
    return <any>raw;
  }
}
