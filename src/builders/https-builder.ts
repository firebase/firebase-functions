import { TriggerAnnotated, FunctionBuilder, TriggerDefinition } from '../builder';
import { Request, Response } from 'express';

export {
  Request,
  Response,
}

export default class CloudHttpsBuilder extends FunctionBuilder {
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
