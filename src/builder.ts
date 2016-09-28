import { FirebaseEnv } from './env';

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

  protected _toTrigger(event?: string): TriggerDefinition {
    throw new Error('Unimplemented _toTrigger');
  }

  protected _makeHandler(fn: Function, event: string): FunctionHandler {
    const env = this._env;
    const handler: FunctionHandler = function() {
      const args = arguments;
      return env.ready().then(function() {
        return fn.apply(undefined, args);
      });
    };
    handler.__trigger = this._toTrigger(event);

    return handler;
  }
}
