// The MIT License (MIT)
//
// Copyright (c) 2022 Firebase
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

import * as express from 'express';
import * as firebase from 'firebase-admin';

import * as logger from '../../logger';
import * as https from './https';

/** How a task should be retried in the event of a non-2xx return. */
export interface RetryConfig {
  /**
   * Maximum number of times a request should be attempted.
   * If left unspecified, will default to 3.
   */
  maxAttempts?: number;

  /**
   * Maximum amount of time for retrying failed task.
   * If left unspecified will retry indefinitely.
   */
  maxRetrySeconds?: number;

  /**
   * The maximum amount of time to wait between attempts.
   * If left unspecified will default to 1hr.
   */
  maxBackoffSeconds?: number;

  /**
   * The maximum number of times to double the backoff between
   * retries. If left unspecified will default to 16.
   */
  maxDoublings?: number;

  /**
   * The minimum time to wait between attempts. If left unspecified
   * will default to 100ms.
   */
  minBackoffSeconds?: number;
}

/** How congestion control should be applied to the function. */
export interface RateLimits {
  // If left unspecified, will default to 100
  maxBurstSize?: number;

  // If left unspecified, wild default to 1000
  maxConcurrentDispatches?: number;

  // If left unspecified, will default to 500
  maxDispatchesPerSecond?: number;
}

export interface AuthData {
  uid: string;
  token: firebase.auth.DecodedIdToken;
}

/** Metadata about a call to a Task Queue function. */
export interface TaskContext {
  /**
   * The result of decoding and verifying an ODIC token.
   */
  auth?: AuthData;
}

/**
 * The request used to call a Task Queue function.
 */
export interface Request<T = any> {
  /**
   * The parameters used by a client when calling this function.
   */
  data: T;

  /**
   * The result of decoding and verifying an ODIC token.
   */
  auth?: AuthData;
}

type v1TaskHandler = (data: any, context: TaskContext) => void | Promise<void>;
type v2TaskHandler<Req> = (request: Request<Req>) => void | Promise<void>;

/** @internal */
export function onDispatchHandler<Req = any>(
  handler: v1TaskHandler | v2TaskHandler<Req>
): (req: https.Request, res: express.Response) => Promise<void> {
  return async (req: https.Request, res: express.Response): Promise<void> => {
    try {
      if (!https.isValidRequest(req)) {
        logger.error('Invalid request, unable to process.');
        throw new https.HttpsError('invalid-argument', 'Bad Request');
      }

      const context: TaskContext = {};
      const status = await https.checkAuthToken(req, context);
      // Note: this should never happen since task queue functions are guarded by IAM.
      if (status === 'INVALID') {
        throw new https.HttpsError('unauthenticated', 'Unauthenticated');
      }

      const data: Req = https.decode(req.body.data);
      if (handler.length === 2) {
        await handler(data, context);
      } else {
        const arg: Request<Req> = {
          ...context,
          data,
        };
        // For some reason the type system isn't picking up that the handler
        // is a one argument function.
        await (handler as any)(arg);
      }

      res.status(204).end();
    } catch (err) {
      if (!(err instanceof https.HttpsError)) {
        // This doesn't count as an 'explicit' error.
        logger.error('Unhandled error', err);
        err = new https.HttpsError('internal', 'INTERNAL');
      }

      const { status } = err.httpErrorCode;
      const body = { error: err.toJSON() };

      res.status(status).send(body);
    }
  };
}
