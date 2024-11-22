// The MIT License (MIT)
//
// Copyright (c) 2021 Firebase
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

import * as cors from "cors";
import * as express from "express";
import { DecodedAppCheckToken } from "firebase-admin/app-check";

import * as logger from "../../logger";

// TODO(inlined): Decide whether we want to un-version apps or whether we want a
// different strategy
import { getAppCheck } from "firebase-admin/app-check";
import { DecodedIdToken, getAuth } from "firebase-admin/auth";
import { getApp } from "../app";
import { isDebugFeatureEnabled } from "../debug";
import { TaskContext } from "./tasks";

const JWT_REGEX = /^[a-zA-Z0-9\-_=]+?\.[a-zA-Z0-9\-_=]+?\.([a-zA-Z0-9\-_=]+)?$/;

/** @internal */
export const CALLABLE_AUTH_HEADER = "x-callable-context-auth";
/** @internal */
export const ORIGINAL_AUTH_HEADER = "x-original-auth";
/** @internal */
export const DEFAULT_HEARTBEAT_SECONDS = 30;

/** An express request with the wire format representation of the request body. */
export interface Request extends express.Request {
  /** The wire format representation of the request body. */
  rawBody: Buffer;
}

/**
 * The interface for AppCheck tokens verified in Callable functions
 */
export interface AppCheckData {
  /**
   * The app ID of a Firebase App attested by the App Check token.
   */
  appId: string;
  /**
   * Decoded App Check token.
   */
  token: DecodedAppCheckToken;
  /**
   * Indicates if the token has been consumed.
   *
   * @remarks
   * `false` value indicates that this is the first time the App Check service has seen this token and marked the
   * token as consumed for future use of the token.
   *
   * `true` value indicates the token has previously been marked as consumed by the App Check service. In this case,
   *  consider taking extra precautions, such as rejecting the request or requiring additional security checks.
   */
  alreadyConsumed?: boolean;
}

/**
 * The interface for Auth tokens verified in Callable functions
 */
export interface AuthData {
  uid: string;
  token: DecodedIdToken;
}

// This type is the direct v1 callable interface and is also an interface
// that the v2 API can conform to. This allows us to pass the v2 CallableRequest
// directly to the same helper methods.
/**
 * The interface for metadata for the API as passed to the handler.
 */
export interface CallableContext {
  /**
   * The result of decoding and verifying a Firebase AppCheck token.
   */
  app?: AppCheckData;

  /**
   * The result of decoding and verifying a Firebase Auth ID token.
   */
  auth?: AuthData;

  /**
   * An unverified token for a Firebase Instance ID.
   */
  instanceIdToken?: string;

  /**
   * The raw request handled by the callable.
   */
  rawRequest: Request;
}

// This could be a simple extension of CallableContext, but we're
// avoiding that to avoid muddying the docs and making a v2 type depend
// on a v1 type.
/**
 * The request used to call a callable function.
 */
export interface CallableRequest<T = any> {
  /**
   * The parameters used by a client when calling this function.
   */
  data: T;

  /**
   * The result of decoding and verifying a Firebase AppCheck token.
   */
  app?: AppCheckData;

  /**
   * The result of decoding and verifying a Firebase Auth ID token.
   */
  auth?: AuthData;

  /**
   * An unverified token for a Firebase Instance ID.
   */
  instanceIdToken?: string;

  /**
   * The raw request handled by the callable.
   */
  rawRequest: Request;
}

/**
 * CallableProxyResponse exposes subset of express.Response object
 * to allow writing partial, streaming responses back to the client.
 */
export interface CallableProxyResponse {
  /**
   * Writes a chunk of the response body to the client. This method can be called
   * multiple times to stream data progressively.
   */
  write: express.Response["write"];
  /**
   * Indicates whether the client has requested and can handle streaming responses.
   * This should be checked before attempting to stream data to avoid compatibility issues.
   */
  acceptsStreaming: boolean;
  /**
   * An AbortSignal that is triggered when the client disconnects or the
   * request is terminated prematurely.
   */
  signal: AbortSignal;
}

/**
 * The set of Firebase Functions status codes. The codes are the same at the
 * ones exposed by {@link https://github.com/grpc/grpc/blob/master/doc/statuscodes.md | gRPC}.
 *
 * @remarks
 * Possible values:
 *
 * - `cancelled`: The operation was cancelled (typically by the caller).
 *
 * - `unknown`: Unknown error or an error from a different error domain.
 *
 * - `invalid-argument`: Client specified an invalid argument. Note that this
 *   differs from `failed-precondition`. `invalid-argument` indicates
 *   arguments that are problematic regardless of the state of the system
 *   (e.g. an invalid field name).
 *
 * - `deadline-exceeded`: Deadline expired before operation could complete.
 *   For operations that change the state of the system, this error may be
 *   returned even if the operation has completed successfully. For example,
 *   a successful response from a server could have been delayed long enough
 *   for the deadline to expire.
 *
 * - `not-found`: Some requested document was not found.
 *
 * - `already-exists`: Some document that we attempted to create already
 *   exists.
 *
 * - `permission-denied`: The caller does not have permission to execute the
 *   specified operation.
 *
 * - `resource-exhausted`: Some resource has been exhausted, perhaps a
 *   per-user quota, or perhaps the entire file system is out of space.
 *
 * - `failed-precondition`: Operation was rejected because the system is not
 *   in a state required for the operation's execution.
 *
 * - `aborted`: The operation was aborted, typically due to a concurrency
 *   issue like transaction aborts, etc.
 *
 * - `out-of-range`: Operation was attempted past the valid range.
 *
 * - `unimplemented`: Operation is not implemented or not supported/enabled.
 *
 * - `internal`: Internal errors. Means some invariants expected by
 *   underlying system has been broken. If you see one of these errors,
 *   something is very broken.
 *
 * - `unavailable`: The service is currently unavailable. This is most likely
 *   a transient condition and may be corrected by retrying with a backoff.
 *
 * - `data-loss`: Unrecoverable data loss or corruption.
 *
 * - `unauthenticated`: The request does not have valid authentication
 *   credentials for the operation.
 */
export type FunctionsErrorCode =
  | "ok"
  | "cancelled"
  | "unknown"
  | "invalid-argument"
  | "deadline-exceeded"
  | "not-found"
  | "already-exists"
  | "permission-denied"
  | "resource-exhausted"
  | "failed-precondition"
  | "aborted"
  | "out-of-range"
  | "unimplemented"
  | "internal"
  | "unavailable"
  | "data-loss"
  | "unauthenticated";

/** @hidden */
export type CanonicalErrorCodeName =
  | "OK"
  | "CANCELLED"
  | "UNKNOWN"
  | "INVALID_ARGUMENT"
  | "DEADLINE_EXCEEDED"
  | "NOT_FOUND"
  | "ALREADY_EXISTS"
  | "PERMISSION_DENIED"
  | "UNAUTHENTICATED"
  | "RESOURCE_EXHAUSTED"
  | "FAILED_PRECONDITION"
  | "ABORTED"
  | "OUT_OF_RANGE"
  | "UNIMPLEMENTED"
  | "INTERNAL"
  | "UNAVAILABLE"
  | "DATA_LOSS";

/** @hidden */
interface HttpErrorCode {
  canonicalName: CanonicalErrorCodeName;
  status: number;
}

/**
 * Standard error codes and HTTP statuses for different ways a request can fail,
 * as defined by:
 * https://github.com/googleapis/googleapis/blob/master/google/rpc/code.proto
 *
 * This map is used primarily to convert from a client error code string to
 * to the HTTP format error code string and status, and make sure it's in the
 * supported set.
 */
const errorCodeMap: { [name in FunctionsErrorCode]: HttpErrorCode } = {
  ok: { canonicalName: "OK", status: 200 },
  cancelled: { canonicalName: "CANCELLED", status: 499 },
  unknown: { canonicalName: "UNKNOWN", status: 500 },
  "invalid-argument": { canonicalName: "INVALID_ARGUMENT", status: 400 },
  "deadline-exceeded": { canonicalName: "DEADLINE_EXCEEDED", status: 504 },
  "not-found": { canonicalName: "NOT_FOUND", status: 404 },
  "already-exists": { canonicalName: "ALREADY_EXISTS", status: 409 },
  "permission-denied": { canonicalName: "PERMISSION_DENIED", status: 403 },
  unauthenticated: { canonicalName: "UNAUTHENTICATED", status: 401 },
  "resource-exhausted": { canonicalName: "RESOURCE_EXHAUSTED", status: 429 },
  "failed-precondition": { canonicalName: "FAILED_PRECONDITION", status: 400 },
  aborted: { canonicalName: "ABORTED", status: 409 },
  "out-of-range": { canonicalName: "OUT_OF_RANGE", status: 400 },
  unimplemented: { canonicalName: "UNIMPLEMENTED", status: 501 },
  internal: { canonicalName: "INTERNAL", status: 500 },
  unavailable: { canonicalName: "UNAVAILABLE", status: 503 },
  "data-loss": { canonicalName: "DATA_LOSS", status: 500 },
};

/** @hidden */
interface HttpErrorWireFormat {
  details?: unknown;
  message: string;
  status: CanonicalErrorCodeName;
}

/**
 * An explicit error that can be thrown from a handler to send an error to the
 * client that called the function.
 */
export class HttpsError extends Error {
  /**
   * A standard error code that will be returned to the client. This also
   * determines the HTTP status code of the response, as defined in code.proto.
   */
  public readonly code: FunctionsErrorCode;

  /**
   * Extra data to be converted to JSON and included in the error response.
   */
  public readonly details: unknown;

  /**
   * A wire format representation of a provided error code.
   *
   * @hidden
   */
  public readonly httpErrorCode: HttpErrorCode;

  constructor(code: FunctionsErrorCode, message: string, details?: unknown) {
    super(message);

    // A sanity check for non-TypeScript consumers.
    if (code in errorCodeMap === false) {
      throw new Error(`Unknown error code: ${code}.`);
    }

    this.code = code;
    this.details = details;
    this.httpErrorCode = errorCodeMap[code];
  }

  /**
   * Returns a JSON-serializable representation of this object.
   */
  public toJSON(): HttpErrorWireFormat {
    const {
      details,
      httpErrorCode: { canonicalName: status },
      message,
    } = this;

    return {
      ...(details === undefined ? {} : { details }),
      message,
      status,
    };
  }
}

/** @hidden */
// The allowed interface for an HTTP request to a Callable function.
interface HttpRequest extends Request {
  body: {
    data: any;
  };
}

/** @hidden */
// The format for an HTTP body response from a Callable function.
interface HttpResponseBody {
  result?: any;
  error?: HttpsError;
}

/** @hidden */
// Returns true if req is a properly formatted callable request.
export function isValidRequest(req: Request): req is HttpRequest {
  // The body must not be empty.
  if (!req.body) {
    logger.warn("Request is missing body.");
    return false;
  }

  // Make sure it's a POST.
  if (req.method !== "POST") {
    logger.warn("Request has invalid method.", req.method);
    return false;
  }

  // Check that the Content-Type is JSON.
  let contentType = (req.header("Content-Type") || "").toLowerCase();
  // If it has a charset, just ignore it for now.
  const semiColon = contentType.indexOf(";");
  if (semiColon >= 0) {
    contentType = contentType.slice(0, semiColon).trim();
  }
  if (contentType !== "application/json") {
    logger.warn("Request has incorrect Content-Type.", contentType);
    return false;
  }

  // The body must have data.
  if (typeof req.body.data === "undefined") {
    logger.warn("Request body is missing data.", req.body);
    return false;
  }

  // TODO(klimt): Allow only specific http headers.

  // Verify that the body does not have any extra fields.
  const extraKeys = Object.keys(req.body).filter((field) => field !== "data");
  if (extraKeys.length !== 0) {
    logger.warn("Request body has extra fields: ", extraKeys.join(", "));
    return false;
  }
  return true;
}

/** @hidden */
const LONG_TYPE = "type.googleapis.com/google.protobuf.Int64Value";
/** @hidden */
const UNSIGNED_LONG_TYPE = "type.googleapis.com/google.protobuf.UInt64Value";

/**
 * Encodes arbitrary data in our special format for JSON.
 * This is exposed only for testing.
 */
/** @hidden */
export function encode(data: any): any {
  if (data === null || typeof data === "undefined") {
    return null;
  }
  if (data instanceof Number) {
    data = data.valueOf();
  }
  if (Number.isFinite(data)) {
    // Any number in JS is safe to put directly in JSON and parse as a double
    // without any loss of precision.
    return data;
  }
  if (typeof data === "boolean") {
    return data;
  }
  if (typeof data === "string") {
    return data;
  }
  if (Array.isArray(data)) {
    return data.map(encode);
  }
  if (typeof data === "object" || typeof data === "function") {
    // Sadly we don't have Object.fromEntries in Node 10, so we can't use a single
    // list comprehension
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      obj[k] = encode(v);
    }
    return obj;
  }
  // If we got this far, the data is not encodable.
  logger.error("Data cannot be encoded in JSON.", data);
  throw new Error(`Data cannot be encoded in JSON: ${data}`);
}

/**
 * Decodes our special format for JSON into native types.
 * This is exposed only for testing.
 */
/** @hidden */
export function decode(data: any): any {
  if (data === null) {
    return data;
  }
  if (data["@type"]) {
    switch (data["@type"]) {
      case LONG_TYPE:
      // Fall through and handle this the same as unsigned.
      case UNSIGNED_LONG_TYPE: {
        // Technically, this could work return a valid number for malformed
        // data if there was a number followed by garbage. But it's just not
        // worth all the extra code to detect that case.
        const value = parseFloat(data.value);
        if (isNaN(value)) {
          logger.error("Data cannot be decoded from JSON.", data);
          throw new Error(`Data cannot be decoded from JSON: ${data}`);
        }
        return value;
      }
      default: {
        logger.error("Data cannot be decoded from JSON.", data);
        throw new Error(`Data cannot be decoded from JSON: ${data}`);
      }
    }
  }
  if (Array.isArray(data)) {
    return data.map(decode);
  }
  if (typeof data === "object") {
    const obj: Record<string, any> = {};
    for (const [k, v] of Object.entries(data)) {
      obj[k] = decode(v);
    }
    return obj;
  }
  // Anything else is safe to return.
  return data;
}

/**
 * Be careful when changing token status values.
 *
 * Users are encouraged to setup log-based metric based on these values, and
 * changing their values may cause their metrics to break.
 *
 */
/** @hidden */
type TokenStatus = "MISSING" | "VALID" | "INVALID";

/** @hidden */
interface CallableTokenStatus {
  app: TokenStatus;
  auth: TokenStatus;
}

/** @internal */
export function unsafeDecodeToken(token: string): unknown {
  if (!JWT_REGEX.test(token)) {
    return {};
  }
  const components = token.split(".").map((s) => Buffer.from(s, "base64").toString());
  let payload = components[1];
  if (typeof payload === "string") {
    try {
      const obj = JSON.parse(payload);
      if (typeof obj === "object") {
        payload = obj;
      }
    } catch (e) {
      // ignore error
    }
  }
  return payload;
}

/**
 * Decode, but not verify, a Auth ID token.
 *
 * Do not use in production. Token should always be verified using the Admin SDK.
 *
 * This is exposed only for testing.
 */
/** @internal */
export function unsafeDecodeIdToken(token: string): DecodedIdToken {
  const decoded = unsafeDecodeToken(token) as DecodedIdToken;
  decoded.uid = decoded.sub;
  return decoded;
}

/**
 * Decode, but not verify, an App Check token.
 *
 * Do not use in production. Token should always be verified using the Admin SDK.
 *
 * This is exposed only for testing.
 */
/** @internal */
export function unsafeDecodeAppCheckToken(token: string): DecodedAppCheckToken {
  const decoded = unsafeDecodeToken(token) as DecodedAppCheckToken;
  decoded.app_id = decoded.sub;
  return decoded;
}

/**
 * Check and verify tokens included in the requests. Once verified, tokens
 * are injected into the callable context.
 *
 * @param {Request} req - Request sent to the Callable function.
 * @param {CallableContext} ctx - Context to be sent to callable function handler.
 * @returns {CallableTokenStatus} Status of the token verifications.
 */
/** @internal */
async function checkTokens(
  req: Request,
  ctx: CallableContext,
  options: CallableOptions
): Promise<CallableTokenStatus> {
  const verifications: CallableTokenStatus = {
    app: "INVALID",
    auth: "INVALID",
  };

  await Promise.all([
    Promise.resolve().then(async () => {
      verifications.auth = await checkAuthToken(req, ctx);
    }),
    Promise.resolve().then(async () => {
      verifications.app = await checkAppCheckToken(req, ctx, options);
    }),
  ]);

  const logPayload = {
    verifications,
    "logging.googleapis.com/labels": {
      "firebase-log-type": "callable-request-verification",
    },
  };

  const errs = [];
  if (verifications.app === "INVALID") {
    errs.push("AppCheck token was rejected.");
  }
  if (verifications.auth === "INVALID") {
    errs.push("Auth token was rejected.");
  }

  if (errs.length === 0) {
    logger.debug("Callable request verification passed", logPayload);
  } else {
    logger.warn(`Callable request verification failed: ${errs.join(" ")}`, logPayload);
  }

  return verifications;
}

/** @interanl */
export async function checkAuthToken(
  req: Request,
  ctx: CallableContext | TaskContext
): Promise<TokenStatus> {
  const authorization = req.header("Authorization");
  if (!authorization) {
    return "MISSING";
  }
  const match = authorization.match(/^Bearer (.*)$/i);
  if (!match) {
    return "INVALID";
  }
  const idToken = match[1];
  try {
    let authToken: DecodedIdToken;
    if (isDebugFeatureEnabled("skipTokenVerification")) {
      authToken = unsafeDecodeIdToken(idToken);
    } else {
      authToken = await getAuth(getApp()).verifyIdToken(idToken);
    }
    ctx.auth = {
      uid: authToken.uid,
      token: authToken,
    };
    return "VALID";
  } catch (err) {
    logger.warn("Failed to validate auth token.", err);
    return "INVALID";
  }
}

/** @internal */
async function checkAppCheckToken(
  req: Request,
  ctx: CallableContext,
  options: CallableOptions
): Promise<TokenStatus> {
  const appCheckToken = req.header("X-Firebase-AppCheck");
  if (!appCheckToken) {
    return "MISSING";
  }
  try {
    let appCheckData: AppCheckData;
    if (isDebugFeatureEnabled("skipTokenVerification")) {
      const decodedToken = unsafeDecodeAppCheckToken(appCheckToken);
      appCheckData = { appId: decodedToken.app_id, token: decodedToken };
      if (options.consumeAppCheckToken) {
        appCheckData.alreadyConsumed = false;
      }
    } else {
      const appCheck = getAppCheck(getApp());
      if (options.consumeAppCheckToken) {
        if (appCheck.verifyToken?.length === 1) {
          const errorMsg =
            "Unsupported version of the Admin SDK." +
            " App Check token will not be consumed." +
            " Please upgrade the firebase-admin to the latest version.";
          logger.error(errorMsg);
          throw new HttpsError("internal", "Internal Error");
        }
        appCheckData = await getAppCheck(getApp()).verifyToken(appCheckToken, { consume: true });
      } else {
        appCheckData = await getAppCheck(getApp()).verifyToken(appCheckToken);
      }
    }
    ctx.app = appCheckData;
    return "VALID";
  } catch (err) {
    logger.warn("Failed to validate AppCheck token.", err);
    if (err instanceof HttpsError) {
      throw err;
    }
    return "INVALID";
  }
}

type v1CallableHandler = (data: any, context: CallableContext) => any | Promise<any>;
type v2CallableHandler<Req, Res> = (
  request: CallableRequest<Req>,
  response?: CallableProxyResponse
) => Res;

/** @internal **/
export interface CallableOptions {
  cors: cors.CorsOptions;
  enforceAppCheck?: boolean;
  consumeAppCheckToken?: boolean;
  /**
   * Time in seconds between sending heartbeat messages to keep the connection
   * alive. Set to `null` to disable heartbeats.
   *
   * Defaults to 30 seconds.
   */
  heartbeatSeconds?: number | null;
}

/** @internal */
export function onCallHandler<Req = any, Res = any>(
  options: CallableOptions,
  handler: v1CallableHandler | v2CallableHandler<Req, Res>,
  version: "gcfv1" | "gcfv2"
): (req: Request, res: express.Response) => Promise<void> {
  const wrapped = wrapOnCallHandler(options, handler, version);
  return (req: Request, res: express.Response) => {
    return new Promise((resolve) => {
      res.on("finish", resolve);
      cors(options.cors)(req, res, () => {
        resolve(wrapped(req, res));
      });
    });
  };
}

function encodeSSE(data: unknown): string {
  return `data: ${JSON.stringify(data)}\n`;
}

/** @internal */
function wrapOnCallHandler<Req = any, Res = any>(
  options: CallableOptions,
  handler: v1CallableHandler | v2CallableHandler<Req, Res>,
  version: "gcfv1" | "gcfv2"
): (req: Request, res: express.Response) => Promise<void> {
  return async (req: Request, res: express.Response): Promise<void> => {
    const abortController = new AbortController();
    let heartbeatInterval: NodeJS.Timeout | null = null;

    const heartbeatSeconds =
      options.heartbeatSeconds === undefined ? DEFAULT_HEARTBEAT_SECONDS : options.heartbeatSeconds;

    const clearScheduledHeartbeat = () => {
      if (heartbeatInterval) {
        clearTimeout(heartbeatInterval);
        heartbeatInterval = null;
      }
    };

    const scheduleHeartbeat = () => {
      clearScheduledHeartbeat();
      if (!abortController.signal.aborted) {
        heartbeatInterval = setTimeout(() => {
          if (!abortController.signal.aborted) {
            res.write(": ping\n");
            scheduleHeartbeat();
          }
        }, heartbeatSeconds * 1000);
      }
    };

    res.on("close", () => {
      clearScheduledHeartbeat();
      abortController.abort();
    });

    try {
      if (!isValidRequest(req)) {
        logger.error("Invalid request, unable to process.");
        throw new HttpsError("invalid-argument", "Bad Request");
      }

      const context: CallableContext = { rawRequest: req };

      // TODO(colerogers): yank this when we release a breaking change of the CLI that removes
      // our monkey-patching code referenced below and increases the minimum supported SDK version.
      //
      // Note: This code is needed to fix v1 callable functions in the emulator with a monorepo setup.
      // The original monkey-patched code lived in the functionsEmulatorRuntime
      // (link: https://github.com/firebase/firebase-tools/blob/accea7abda3cc9fa6bb91368e4895faf95281c60/src/emulator/functionsEmulatorRuntime.ts#L480)
      // and was not compatible with how monorepos separate out packages (see https://github.com/firebase/firebase-tools/issues/5210).
      if (isDebugFeatureEnabled("skipTokenVerification") && version === "gcfv1") {
        const authContext = context.rawRequest.header(CALLABLE_AUTH_HEADER);
        if (authContext) {
          logger.debug("Callable functions auth override", {
            key: CALLABLE_AUTH_HEADER,
            value: authContext,
          });
          context.auth = JSON.parse(decodeURIComponent(authContext));
          delete context.rawRequest.headers[CALLABLE_AUTH_HEADER];
        }

        const originalAuth = context.rawRequest.header(ORIGINAL_AUTH_HEADER);
        if (originalAuth) {
          context.rawRequest.headers["authorization"] = originalAuth;
          delete context.rawRequest.headers[ORIGINAL_AUTH_HEADER];
        }
      }

      const tokenStatus = await checkTokens(req, context, options);
      if (tokenStatus.auth === "INVALID") {
        throw new HttpsError("unauthenticated", "Unauthenticated");
      }
      if (tokenStatus.app === "INVALID") {
        if (options.enforceAppCheck) {
          throw new HttpsError("unauthenticated", "Unauthenticated");
        } else {
          logger.warn(
            "Allowing request with invalid AppCheck token because enforcement is disabled"
          );
        }
      }
      if (tokenStatus.app === "MISSING" && options.enforceAppCheck) {
        throw new HttpsError("unauthenticated", "Unauthenticated");
      }

      const instanceId = req.header("Firebase-Instance-ID-Token");
      if (instanceId) {
        // Validating the token requires an http request, so we don't do it.
        // If the user wants to use it for something, it will be validated then.
        // Currently, the only real use case for this token is for sending
        // pushes with FCM. In that case, the FCM APIs will validate the token.
        context.instanceIdToken = req.header("Firebase-Instance-ID-Token");
      }

      const acceptsStreaming = req.header("accept") === "text/event-stream";

      if (acceptsStreaming && version === "gcfv1") {
        // streaming responses are not supported in v1 callable
        throw new HttpsError("invalid-argument", "Unsupported Accept header 'text/event-stream'");
      }

      const data: Req = decode(req.body.data);
      let result: Res;
      if (version === "gcfv1") {
        result = await (handler as v1CallableHandler)(data, context);
      } else {
        const arg: CallableRequest<Req> = {
          ...context,
          data,
        };

        const responseProxy: CallableProxyResponse = {
          write(chunk): boolean {
            // if client doesn't accept sse-protocol, response.write() is no-op.
            if (!acceptsStreaming) {
              return false;
            }
            // if connection is already closed, response.write() is no-op.
            if (abortController.signal.aborted) {
              return false;
            }
            const formattedData = encodeSSE({ message: chunk });
            const wrote = res.write(formattedData);
            // Reset heartbeat timer after successful write
            if (wrote && heartbeatInterval !== null && heartbeatSeconds > 0) {
              scheduleHeartbeat();
            }
            return wrote;
          },
          acceptsStreaming,
          signal: abortController.signal,
        };
        if (acceptsStreaming) {
          // SSE always responds with 200
          res.status(200);

          if (heartbeatSeconds !== null && heartbeatSeconds > 0) {
            scheduleHeartbeat();
          }
        }
        // For some reason the type system isn't picking up that the handler
        // is a one argument function.
        result = await (handler as any)(arg, responseProxy);
        clearScheduledHeartbeat();
      }
      if (!abortController.signal.aborted) {
        // Encode the result as JSON to preserve types like Dates.
        result = encode(result);
        // If there was some result, encode it in the body.
        const responseBody: HttpResponseBody = { result };
        if (acceptsStreaming) {
          res.write(encodeSSE(responseBody));
          res.end();
        } else {
          res.status(200).send(responseBody);
        }
      } else {
        res.end();
      }
    } catch (err) {
      if (!abortController.signal.aborted) {
        let httpErr = err;
        if (!(err instanceof HttpsError)) {
          // This doesn't count as an 'explicit' error.
          logger.error("Unhandled error", err);
          httpErr = new HttpsError("internal", "INTERNAL");
        }
        const { status } = httpErr.httpErrorCode;
        const body = { error: httpErr.toJSON() };
        if (version === "gcfv2" && req.header("accept") === "text/event-stream") {
          res.send(encodeSSE(body));
        } else {
          res.status(status).send(body);
        }
      } else {
        res.end();
      }
    } finally {
      clearScheduledHeartbeat();
    }
  };
}
