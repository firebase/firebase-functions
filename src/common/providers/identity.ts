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

// import * as cors from 'cors';
import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as jwt from "jsonwebtoken";
import * as api from "../api";
import { HttpsError, encode } from "./https";
import { EventContext } from "../../cloud-functions";
import { logger } from '../..';

export { HttpsError };

/* API Constants */
const JWT_CLIENT_CERT_URL = "https://www.googleapis.com";
const JWT_CLIENT_CERT_PATH = "robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const JWT_ALG = "RS256";
const JWT_ISSUER = 'https://securetoken.google.com/';

/** @internal */
const EVENT_MAPPING: Record<string, string> = {
  beforeCreate: 'providers/cloud.auth/eventTypes/user.beforeCreate',
  beforeSignIn: 'providers/cloud.auth/eventTypes/user.beforeSignIn',
}

export type AuthError = HttpsError;

// copied from src/providers/auth.ts
export type UserRecord = firebase.auth.UserRecord;

/** Defines the Auth event context. */
export interface AuthEventContext extends EventContext {
  locale?: string;
  ipAddress: string;
  userAgent: string;
  additionalUserInfo?: {
    providerId: string;
    profile?: any;
    username?: string;
    isNewUser: boolean;
  };
  credential?:{
    claims?: {[key: string]: any};
    idToken?: string;
    accessToken?: string;
    refreshToken?: string;
    expirationTime?: string;
    secret?: string;
    providerId: string;
    signInMethod: string;
  };
}

export interface BeforeCreateResponse {
  displayName?: string;
  disabled?: boolean;
  emailVerified?: boolean;
  photoURL?: string;
  customClaims?: object;
}

export interface BeforeSignInResponse extends BeforeCreateResponse {
  sessionClaims?: object;
}

/** Defines HTTP event JWT. */
/** @internal */
interface DecodedJwt {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub: string;
  event_id: string;
  event_type: string;
  ip_address: string;
  user_agent?: string;
  locale?: string;
  sign_in_method?: string;
  // user_record?: DecodedJwtUserRecord;
  tenant_id?: string;
  raw_user_info?: string;
  sign_in_attributes?: {
    [key: string]: any;
  };
  oauth_id_token?: string;
  oauth_access_token?: string;
  oauth_refresh_token?: string;
  oauth_token_secret?: string;
  oauth_expires_in?: number;
  [key: string]: any;
}

/** @internal */
async function fetchPublicKeys(): Promise<Record<string, string>> {
  try {
    return await api.get<Record<string,string>>(`${JWT_CLIENT_CERT_URL}/${JWT_CLIENT_CERT_PATH}`);
  } catch (err) {
    logger.error(`Failed to obtain public keys for JWT verification: ${err.message}`);
    throw new HttpsError('internal', 'Failed to obtain public keys');
  }
}

/** @internal */
function validRequest(req): void {
  if (req.method !== "POST") {
    throw new HttpsError('invalid-argument', `Request has invalid method "${req.method}".`);
  }

  const contentType: string = (req.header('Content-Type') || '').toLowerCase();
  if (contentType.includes("application/json")) {
    throw new HttpsError('invalid-argument', `Request has invalid header Content-Type.`);
  }

  if (!req.body || !req.body.data || !req.body.data.jwt) {
    throw new HttpsError('invalid-argument', 'Request is missing body.');
  }
}

/** @internal */
function getPublicKey(header: Record<string, any>, publicKeys): string {
  if (header.alg !== JWT_ALG) {
    throw new HttpsError('invalid-argument', `Provided JWT has incorrect algorithm. Expected ${JWT_ALG} but got ${header.alg}.`);
  }
  if (typeof header.kid === 'undefined') {
    throw new HttpsError('invalid-argument', 'JWT has no "kid" claim.');
  }
  if (!publicKeys.hasOwnProperty(header.kid)) {
    throw new HttpsError('invalid-argument', 'Provided JWT has "kid" claim which does not correspond to a known public key. Most likely the JWT is expired.');
  }

  return publicKeys[header.kid];
}

/** @internal */
function isAuthorizedCloudFunctionURL(cloudFunctionUrl: string, projectId: string): boolean {
  // Region can be:
  // us-central1, us-east1, asia-northeast1, europe-west1, asia-east1.
  // Sample: https://europe-west1-fb-sa-upgraded.cloudfunctions.net/function-1
  const gcf_directions = [
    'central', 'east', 'west', 'south', 'southeast', 'northeast',
    // Other possible directions that could be added.
    'north', 'southwest', 'northwest',
  ];
  const re = new RegExp(
      `^https://[^-]+-(${gcf_directions.join('|')})[0-9]+-${projectId}\.cloudfunctions\.net/`);
  const res = re.exec(cloudFunctionUrl) || [];
  return res.length > 0;
}

/** @internal */
function checkDecodedToken(decodedJWT: DecodedJwt, projectId: string): void {
  if (!isAuthorizedCloudFunctionURL(decodedJWT.aud, projectId)) {
    throw new HttpsError('invalid-argument', 'Provided JWT has incorrect "aud" (audience) claim.');
  }
  if (decodedJWT.iss !== `${JWT_ISSUER}${projectId}`) {
    throw new HttpsError('invalid-argument', 
      `Provided JWT has incorrect "iss" (issuer) claim. Expected ` +
      `"${JWT_ISSUER}${projectId}" but got "${decodedJWT.iss}".`
    );
  }
  if (typeof decodedJWT.sub !== 'string' || decodedJWT.sub === '') {
    throw new HttpsError('invalid-argument', 'Provided JWT has no "sub" (subject) claim.')
  }
  if (decodedJWT.sub.length > 128) {
    throw new HttpsError('invalid-argument', 'Provided JWT has "sub" (subject) claim longer than 128 characters.');
  }
}

/** @internal */
function verifyAndDecodeJWT(token: string, eventType: string, publicKeys: Record<string, string>) {
  // jwt decode & verify - https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
  const header = (jwt.decode(token, { complete: true }) as Record<string, any>).header || {};
  const publicKey = getPublicKey(header, publicKeys);
  const decoded = jwt.verify(token, publicKey, { algorithms: [this.algorithm] }) as DecodedJwt;
  decoded.uid = decoded.sub;
  checkDecodedToken(decoded, process.env.GCLOUD_PROJECT);

  if (decoded.event_type !== eventType) {
    throw new HttpsError('invalid-argument', '');
  }
  return decoded;
}


/** @internal */
function parseUserRecord(user)/*: UserRecord*/ {
  // stub
  return {
    disabled: false,
    emailVerified: false,
    metadata: {
      creationTime: '',
      lastSignInTime: '',
    },
    uid: '',
    providerData: [],
  };
}

/** @internal */
function parseAuthEventContext(decodedJWT: DecodedJwt): AuthEventContext {
  // stub
  return {
    ipAddress: '',
    userAgent: '',
    eventId: '',
    eventType: '',
    params: {},
    resource: {
      service: '',
      name: '',
    },
    timestamp: '',
  };
}

/** @internal */
export function createHandler(
  handler: (user: UserRecord, context: AuthEventContext) => any,
  eventType: string
): (req: express.Request, resp: express.Response) => Promise<void> {
  const wrappedHandler = wrapHandler(handler, eventType);
  return (req: express.Request, res: express.Response) => {
    return new Promise((resolve) => {
      res.on('finish', resolve);
      resolve(wrappedHandler(req, res));
    });
  }
}


/** @internal */
function wrapHandler(
  handler: (user: UserRecord, context: AuthEventContext) => any,
  eventType: string
) {
  return async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const publicKeys = fetchPublicKeys();
      validRequest(req);
      const decodedJWT = verifyAndDecodeJWT(req.body.data.jwt, eventType, await publicKeys);
      const userRecord = parseUserRecord(decodedJWT.user_record);
      const authEventContext = parseAuthEventContext(decodedJWT);

      const authRequest = await handler(userRecord as UserRecord, authEventContext); // TODO: remove `as UserRecord`
      const result = encode(authRequest);

      // do some data manipulation??

      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(result));
    } catch (err) {
      // check if the error is of type HTTPS error
      if (!(err instanceof HttpsError)) {
        // This doesn't count as an 'explicit' error.
        logger.error('Unhandled error', err);
        err = new HttpsError('internal', 'INTERNAL');
      }

      res.status(err.code);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(err.toJSON()));
    }
  }
  
}

