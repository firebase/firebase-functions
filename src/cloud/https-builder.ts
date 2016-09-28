import { FunctionHandler, FunctionBuilder, TriggerDefinition } from '../builder';

export interface CloudHttpsHandler extends FunctionHandler {
  (req: any, res: any): any;
}

export default class CloudHttpsBuilder extends FunctionBuilder {
  on(event: string, handler: CloudHttpsHandler): CloudHttpsHandler {
    if (event !== 'request') {
      throw new Error(`Provider cloud.http does not support event type "${event}"`);
    }

    console.warn(
      'DEPRECATION NOTICE: cloud.http().on("request", handler) is deprecated, use cloud.http().onRequest(handler)'
    );

    return this.onRequest(handler);
  }

  onRequest(handler: CloudHttpsHandler): CloudHttpsHandler {
    let wrappedHandler: CloudHttpsHandler = (req, res) => {
      this._env.ready().then(() => {
        handler(req, res);
      }, err => {
        console.log('Firebase: HTTP function environment configuration failed to load, sending 500 response.');
        return res.json({
          error: {
            code: 500,
            status: 'FAILED_PRECONDITION',
            message: 'An error occurred during environment initialization.',
          },
        });
      });
    };
    wrappedHandler.__trigger = this._toTrigger('request');

    return wrappedHandler;
  }

  protected _toTrigger(event: string): TriggerDefinition {
    return {
      service: 'cloud.http',
      event,
    };
  }
}
