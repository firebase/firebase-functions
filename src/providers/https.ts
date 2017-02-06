import { TriggerAnnotated } from './base';
import {env} from '../env';
import {Request, Response} from 'express';

export function onRequest(
  handler: (req: Request, resp: Response) => void
): ((req: Request, resp: Response) => void) & TriggerAnnotated {
  let cloudFunction: any = (req, res) => {
    env().ready().then(() => {
      handler(req, res);
    }, (err) => {
      console.error('Firebase: HTTP function environment configuration failed to load, sending 500 response.', err);
      return res.json({
        error: {
          code: 500,
          status: 'FAILED_PRECONDITION',
          message: 'An error occurred during environment initialization.',
        },
      });
    });
  };
  cloudFunction.__trigger = {httpsTrigger: {}};

  return cloudFunction;
}
