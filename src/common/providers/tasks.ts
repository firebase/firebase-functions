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

import * as express from "express";
import { DecodedIdToken } from "firebase-admin/auth";

import * as logger from "../../logger";
import * as https from "./https";

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
  /**
   * The maximum number of requests that can be outstanding at a time.
   * If left unspecified, will default to 1000.
   */
  maxConcurrentDispatches?: number;

  /**
   * The maximum number of requests that can be invoked per second.
   * If left unspecified, will default to 500.
   */
  maxDispatchesPerSecond?: number;
}

/** Metadata about the authorization used to invoke a function. */
export interface AuthData {
  uid: string;
  token: DecodedIdToken;
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
        logger.error("Invalid request, unable to process.");
        throw new https.HttpsError("invalid-argument", "Bad Request");
      }

      const context: TaskContext = {};
      if (!process.env.FUNCTIONS_EMULATOR) {
        const authHeader = req.header("Authorization") || "";
        const token = authHeader.match(/^Bearer (.*)$/)?.[1];
        // Note: this should never happen since task queue functions are guarded by IAM.
        if (!token) {
          throw new https.HttpsError("unauthenticated", "Unauthenticated");
        }
        // We skip authenticating the token since tq functions are guarded by IAM.
        const authToken = https.unsafeDecodeIdToken(token);
        context.auth = {
          uid: authToken.uid,
          token: authToken,
        };
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
      let httpErr = err;
      if (!(err instanceof https.HttpsError)) {
        // This doesn't count as an 'explicit' error.
        logger.error("Unhandled error", err);
        httpErr = new https.HttpsError("internal", "INTERNAL");
      }

      const { status } = httpErr.httpErrorCode;
      const body = { error: httpErr.toJSON() };

      res.status(status).send(body);
    }
  };
}
