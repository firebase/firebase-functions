import { TriggerAnnotated, AbstractFunctionBuilder, Trigger } from './base';
import {env} from '../env';
import {Request, Response} from 'express';

export function https() {
  return new https.FunctionBuilder();
}

export namespace https {
  export class FunctionBuilder extends AbstractFunctionBuilder {
    onRequest(
      handler: (req: Request, resp: Response) => void
    ): ((req: Request, resp: Response) => void) & TriggerAnnotated {
      let wrappedHandler: any = (req, res) => {
        env().ready().then(() => {
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
      wrappedHandler.__trigger = this._toTrigger();

      return wrappedHandler;
    }

    protected _toTrigger(): Trigger {
      return {
        httpsTrigger: {},
      };
    }
  }
}
