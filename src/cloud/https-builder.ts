import { TriggerAnnotated, FunctionBuilder, TriggerDefinition } from '../builder';
import { Request, Response } from 'express';

export {
  Request,
  Response,
}

export default class CloudHttpsBuilder extends FunctionBuilder {
  on(
    event: string, handler: (req: Request, resp: Response) => void
  ): ((req: Request, resp: Response) => void) & TriggerAnnotated {
    if (event !== 'request') {
      throw new Error(`Provider cloud.http does not support event type "${event}"`);
    }

    console.warn(
      'DEPRECATION NOTICE: cloud.http().on("request", handler) is deprecated, use cloud.http().onRequest(handler)'
    );

    return this.onRequest(handler);
  }

  onRequest(
    handler: (req: Request, resp: Response) => void
  ): ((req: Request, resp: Response) => void) & TriggerAnnotated {
    let wrappedHandler: any = (req, res) => {
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
