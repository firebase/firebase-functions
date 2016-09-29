import * as _ from 'lodash';

import { FirebaseEnv } from './env';
import { FirebaseEventMetadata, Event } from './event';
import { FunctionHandler } from './builder';

export interface FunctionHandler {
  (...args: any[]);
  __trigger?: {[key: string]: any};
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

  protected _wrapHandler( handler: (event: Event<any>) => any,
                          event: string,
                          additionalMeta: FirebaseEventMetadata,
                          payloadTransform = (i: any) => { return i; }): FunctionHandler {

    return this._makeHandler((payload) => {
      const metadata = <FirebaseEventMetadata>_.extend({}, additionalMeta, payload);
      return handler(new Event(metadata, payloadTransform(payload)));
    }, event);
  }

  protected _makeHandler(fn: Function, event: string): FunctionHandler {
    const handler: FunctionHandler = (payload) => {
      return this._env.ready().then(function() {
        return fn(payload);
      });
    };
    handler.__trigger = this._toTrigger(event);

    return handler;
  }
}
