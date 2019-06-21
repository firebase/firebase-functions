// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
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
import * as _ from 'lodash';
import * as cors from 'cors';
import { apps } from '../apps';
import { HttpsFunction, optionsToTrigger, Runnable } from '../cloud-functions';
import { DeploymentOptions } from '../function-builder';

/**
 *
 *
 */
export interface Request extends express.Request {
  rawBody: Buffer;
}
/**
 * Handle HTTP requests.
 * @param handler A function that takes a request and response object,
 * same signature as an Express app.
 */
export function onRequest(
  handler: (req: Request, resp: express.Response) => void
): HttpsFunction {
  return _onRequestWithOpts(handler, {});
}

/**
 * Declares a callable method for clients to call using a Firebase SDK.
 * @param handler A method that takes a data and context and returns a value.
 */
export function onCall(
  handler: (data: any, context: CallableContext) => any | Promise<any>
): HttpsFunction & Runnable<any> {
  return _onCallWithOpts(handler, {});
}

/** @internal */
export function _onRequestWithOpts(
  handler: (req: Request, resp: express.Response) => void,
  opts: DeploymentOptions
): HttpsFunction {
  // lets us add __trigger without altering handler:
  let cloudFunction: any = (req: Request, res: express.Response) => {
    handler(req, res);
  };
  cloudFunction.__trigger = _.assign(optionsToTrigger(opts), {
    httpsTrigger: {},
  });
  // TODO parse the opts
  return cloudFunction;
}

/**
 * The set of Firebase Functions status codes. The codes are the same at the
 * ones exposed by gRPC here:
 * https://github.com/grpc/grpc/blob/master/doc/statuscodes.md
 *
 * Possible values:
 * - 'cancelled': The operation was cancelled (typically by the caller).
 * - 'unknown': Unknown error or an error from a different error domain.
 * - 'invalid-argument': Client specified an invalid argument. Note that this
 *   differs from 'failed-precondition'. 'invalid-argument' indicates
 *   arguments that are problematic regardless of the state of the system
 *   (e.g. an invalid field name).
 * - 'deadline-exceeded': Deadline expired before operation could complete.
 *   For operations that change the state of the system, this error may be
 *   returned even if the operation has completed successfully. For example,
 *   a successful response from a server could have been delayed long enough
 *   for the deadline to expire.
 * - 'not-found': Some requested document was not found.
 * - 'already-exists': Some document that we attempted to create already
 *   exists.
 * - 'permission-denied': The caller does not have permission to execute the
 *   specified operation.
 * - 'resource-exhausted': Some resource has been exhausted, perhaps a
 *   per-user quota, or perhaps the entire file system is out of space.
 * - 'failed-precondition': Operation was rejected because the system is not
 *   in a state required for the operation's execution.
 * - 'aborted': The operation was aborted, typically due to a concurrency
 *   issue like transaction aborts, etc.
 * - 'out-of-range': Operation was attempted past the valid range.
 * - 'unimplemented': Operation is not implemented or not supported/enabled.
 * - 'internal': Internal errors. Means some invariants expected by
 *   underlying system has been broken. If you see one of these errors,
 *   something is very broken.
 * - 'unavailable': The service is currently unavailable. This is most likely
 *   a transient condition and may be corrected by retrying with a backoff.
 * - 'data-loss': Unrecoverable data loss or corruption.
 * - 'unauthenticated': The request does not have valid authentication
 *   credentials for the operation.
 */
export type FunctionsErrorCode =
  | 'ok'
  | 'cancelled'
  | 'unknown'
  | 'invalid-argument'
  | 'deadline-exceeded'
  | 'not-found'
  | 'already-exists'
  | 'permission-denied'
  | 'resource-exhausted'
  | 'failed-precondition'
  | 'aborted'
  | 'out-of-range'
  | 'unimplemented'
  | 'internal'
  | 'unavailable'
  | 'data-loss'
  | 'unauthenticated';

/**
 * Standard error codes for different ways a request can fail, as defined by:
 * https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
 *
 * This map is used primarily to convert from a client error code string to
 * to the HTTP format error code string, and make sure it's in the supported set.
 */
const errorCodeMap: { [name: string]: string } = {
  ok: 'OK',
  cancelled: 'CANCELLED',
  unknown: 'UNKNOWN',
  'invalid-argument': 'INVALID_ARGUMENT',
  'deadline-exceeded': 'DEADLINE_EXCEEDED',
  'not-found': 'NOT_FOUND',
  'already-exists': 'ALREADY_EXISTS',
  'permission-denied': 'PERMISSION_DENIED',
  unauthenticated: 'UNAUTHENTICATED',
  'resource-exhausted': 'RESOURCE_EXHAUSTED',
  'failed-precondition': 'FAILED_PRECONDITION',
  aborted: 'ABORTED',
  'out-of-range': 'OUT_OF_RANGE',
  unimplemented: 'UNIMPLEMENTED',
  internal: 'INTERNAL',
  unavailable: 'UNAVAILABLE',
  'data-loss': 'DATA_LOSS',
};

/**
 * An explicit error that can be thrown from a handler to send an error to the
 * client that called the function.
 */
export class HttpsError extends Error {
  /**
   * A standard error code that will be returned to the client. This also
   * determines the HTTP status code of the response, as defined in code.proto.
   */
  readonly code: FunctionsErrorCode;

  /**
   * Extra data to be converted to JSON and included in the error response.
   */
  readonly details?: unknown;

  constructor(code: FunctionsErrorCode, message: string, details?: unknown) {
    super(message);

    if (!errorCodeMap[code]) {
      throw new Error('Unknown error status: ' + code);
    }

    this.code = code;
    this.details = details;
  }

  /**
   * @internal
   * A string representation of the Google error code for this error for HTTP.
   */
  get status() {
    return errorCodeMap[this.code];
  }

  /**
   * @internal
   * Returns the canonical http status code for the given error.
   */
  get httpStatus(): number {
    switch (this.code) {
      case 'ok':
        return 200;
      case 'cancelled':
        return 499;
      case 'unknown':
        return 500;
      case 'invalid-argument':
        return 400;
      case 'deadline-exceeded':
        return 504;
      case 'not-found':
        return 404;
      case 'already-exists':
        return 409;
      case 'permission-denied':
        return 403;
      case 'unauthenticated':
        return 401;
      case 'resource-exhausted':
        return 429;
      case 'failed-precondition':
        return 400;
      case 'aborted':
        return 409;
      case 'out-of-range':
        return 400;
      case 'unimplemented':
        return 501;
      case 'internal':
        return 500;
      case 'unavailable':
        return 503;
      case 'data-loss':
        return 500;
      // This should never happen as long as the type system is doing its job.
      default:
        throw 'Invalid error code: ' + this.code;
    }
  }

  /** @internal */
  public toJSON() {
    const json: any = {
      status: this.status,
      message: this.message,
    };
    if (!_.isUndefined(this.details)) {
      json.details = this.details;
    }
    return json;
  }
}

/**
 * The interface for metadata for the API as passed to the handler.
 */
export interface CallableContext {
  /**
   * The result of decoding and verifying a Firebase Auth ID token.
   */
  auth?: {
    uid: string;
    token: firebase.auth.DecodedIdToken;
  };

  /**
   * An unverified token for a Firebase Instance ID.
   */
  instanceIdToken?: string;

  /**
   * The raw request handled by the callable.
   */
  rawRequest: Request;
}

// The allowed interface for an http request for a callable function.
interface HttpRequest extends Request {
  body: {
    data: any;
  };
}

// The format for the http body response to a callable function.
interface HttpResponseBody {
  result?: any;
  error?: HttpsError;
}

// Returns true if req is a properly formatted callable request.
function isValidRequest(req: Request): req is HttpRequest {
  // The body must not be empty.
  if (!req.body) {
    console.warn('Request is missing body.');
    return false;
  }

  // Make sure it's a POST.
  if (req.method !== 'POST') {
    console.warn('Request has invalid method.', req.method);
    return false;
  }

  // Check that the Content-Type is JSON.
  let contentType = (req.header('Content-Type') || '').toLowerCase();
  // If it has a charset, just ignore it for now.
  const semiColon = contentType.indexOf(';');
  if (semiColon >= 0) {
    contentType = contentType.substr(0, semiColon).trim();
  }
  if (contentType !== 'application/json') {
    console.warn('Request has incorrect Content-Type.', contentType);
    return false;
  }

  // The body must have data.
  if (_.isUndefined(req.body.data)) {
    console.warn('Request body is missing data.', req.body);
    return false;
  }

  // TODO(klimt): Allow only whitelisted http headers.

  // Verify that the body does not have any extra fields.
  const extras = _.omit(req.body, 'data');
  if (!_.isEmpty(extras)) {
    console.warn('Request body has extra fields.', extras);
    return false;
  }
  return true;
}

const LONG_TYPE = 'type.googleapis.com/google.protobuf.Int64Value';
const UNSIGNED_LONG_TYPE = 'type.googleapis.com/google.protobuf.UInt64Value';

/**
 * Encodes arbitrary data in our special format for JSON.
 * This is exposed only for testing.
 */
/** @internal */
export function encode(data: any): any {
  if (_.isNull(data) || _.isUndefined(data)) {
    return null;
  }
  // Oddly, _.isFinite(new Number(x)) always returns false, so unwrap Numbers.
  if (data instanceof Number) {
    data = data.valueOf();
  }
  if (_.isFinite(data)) {
    // Any number in JS is safe to put directly in JSON and parse as a double
    // without any loss of precision.
    return data;
  }
  if (_.isBoolean(data)) {
    return data;
  }
  if (_.isString(data)) {
    return data;
  }
  if (_.isArray(data)) {
    return _.map(data, encode);
  }
  if (_.isObject(data)) {
    // It's not safe to use _.forEach, because the object might be 'array-like'
    // if it has a key called 'length'. Note that this intentionally overrides
    // any toJSON method that an object may have.
    return _.mapValues(data, encode);
  }
  // If we got this far, the data is not encodable.
  console.error('Data cannot be encoded in JSON.', data);
  throw new Error('Data cannot be encoded in JSON: ' + data);
}

/**
 * Decodes our special format for JSON into native types.
 * This is exposed only for testing.
 */
/** @internal */
export function decode(data: any): any {
  if (data === null) {
    return data;
  }
  if (data['@type']) {
    switch (data['@type']) {
      case LONG_TYPE:
      // Fall through and handle this the same as unsigned.
      case UNSIGNED_LONG_TYPE: {
        // Technically, this could work return a valid number for malformed
        // data if there was a number followed by garbage. But it's just not
        // worth all the extra code to detect that case.
        const value = parseFloat(data.value);
        if (_.isNaN(value)) {
          console.error('Data cannot be decoded from JSON.', data);
          throw new Error('Data cannot be decoded from JSON: ' + data);
        }
        return value;
      }
      default: {
        console.error('Data cannot be decoded from JSON.', data);
        throw new Error('Data cannot be decoded from JSON: ' + data);
      }
    }
  }
  if (_.isArray(data)) {
    return _.map(data, decode);
  }
  if (_.isObject(data)) {
    // It's not safe to use _.forEach, because the object might be 'array-like'
    // if it has a key called 'length'.
    return _.mapValues(data, decode);
  }
  // Anything else is safe to return.
  return data;
}

const corsHandler = cors({ origin: true, methods: 'POST' });

/** @internal */
export function _onCallWithOpts(
  handler: (data: any, context: CallableContext) => any | Promise<any>,
  opts: DeploymentOptions
): HttpsFunction & Runnable<any> {
  const func = async (req: Request, res: express.Response) => {
    try {
      if (!isValidRequest(req)) {
        console.error('Invalid request', req);
        throw new HttpsError('invalid-argument', 'Bad Request');
      }

      const context: CallableContext = { rawRequest: req };

      const authorization = req.header('Authorization');
      if (authorization) {
        const match = authorization.match(/^Bearer (.*)$/);
        if (!match) {
          throw new HttpsError('unauthenticated', 'Unauthenticated');
        }
        const idToken = match[1];
        try {
          const authToken = await apps()
            .admin.auth()
            .verifyIdToken(idToken);
          context.auth = {
            uid: authToken.uid,
            token: authToken,
          };
        } catch (e) {
          throw new HttpsError('unauthenticated', 'Unauthenticated');
        }
      }

      const instanceId = req.header('Firebase-Instance-ID-Token');
      if (instanceId) {
        // Validating the token requires an http request, so we don't do it.
        // If the user wants to use it for something, it will be validated then.
        // Currently, the only real use case for this token is for sending
        // pushes with FCM. In that case, the FCM APIs will validate the token.
        context.instanceIdToken = req.header('Firebase-Instance-ID-Token');
      }

      const data = decode(req.body.data);
      let result: any = await handler(data, context);

      // Encode the result as JSON to preserve types like Dates.
      result = encode(result);

      // If there was some result, encode it in the body.
      const responseBody: HttpResponseBody = { result };
      res.status(200).send(responseBody);
    } catch (error) {
      if (!(error instanceof HttpsError)) {
        // This doesn't count as an 'explicit' error.
        console.error('Unhandled error', error);
        error = new HttpsError('internal', 'INTERNAL');
      }

      const status = error.httpStatus;
      const body = { error: error.toJSON() };
      res.status(status).send(body);
    }
  };

  // Wrap the function with a cors handler.
  const corsFunc: any = (req: Request, res: express.Response) => {
    return corsHandler(req, res, () => func(req, res));
  };

  corsFunc.__trigger = _.assign(optionsToTrigger(opts), {
    httpsTrigger: {},
    labels: { 'deployment-callable': 'true' },
  });

  corsFunc.run = handler;

  return corsFunc;
}
