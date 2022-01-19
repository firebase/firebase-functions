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

import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as _ from 'lodash';
import * as jwt from "jsonwebtoken";
import fetch from "node-fetch";
import { HttpsError, encode } from "./https";
import { EventContext } from "../../cloud-functions";
import { logger } from '../..';
import { user } from '../../providers/auth';
import { type } from 'os';

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

type UserInfo = firebase.auth.UserInfo;

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




/** @internal */
interface DecodedJwtMetadata {
  creation_time?: number;
  last_sign_in_time?: number;
}

/** @internal */
interface DecodedJwtProviderUserInfo {
  uid: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  phone_number?: string;
  provider_id: string;
}

/** @internal */
interface DecodedJwtMfaInfo {
  uid: string;
  display_name?: string;
  phone_number?: string;
  enrollment_time?: string;
  factor_id?: string;
}

/** @internal */
interface DecodedJwtEnrolledFactors {
  enrolled_factors?: DecodedJwtMfaInfo[];
}

/** @internal */
interface DecodedJwtUserRecord {
  uid: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  display_name?: string;
  photo_url?: string;
  disabled?: boolean;
  metadata?: DecodedJwtMetadata;
  password_hash?: string;
  password_salt?: string;
  provider_data?: DecodedJwtProviderUserInfo[];
  multi_factor?: DecodedJwtEnrolledFactors;
  custom_claims?: any;
  tokens_valid_after_time?: number;
  tenant_id?: string;
  [key: string]: any;
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
  user_record?: DecodedJwtUserRecord;
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
  const url = `${JWT_CLIENT_CERT_URL}/${JWT_CLIENT_CERT_PATH}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data as Record<string, string>;
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
function parseUserRecord(decodedJWTUserRecord: DecodedJwtUserRecord): UserRecord {
  if (!decodedJWTUserRecord.uid) {
    throw new HttpsError('internal', 'INTERNAL ASSERT FAILED: Invalid user response');
  }
  const modifiedJWT = snakeCase2CamelCase(
    decodedJWTUserRecord,
    // photo_url maps to photoURL.
    {photo_url: 'photoURL'},
    {
      // customClaims content should not be modified as these are set by
      // external developer.
      custom_claims: 'customClaims',
      // Exclude provider_data which will be processed in UserInfo.
      // provider_data: 'providerData',
      // Exclude multi_factor which will be processed in MultiFactorInfo.
      multi_factor: 'multiFactor',
      // Exclude metadata which will be processed in UserMetadata.
      metadata: 'metadata',
    }
  );

  if (modifiedJWT.metadata.creationTime) {
    modifiedJWT.metadata.creationTime = (modifiedJWT.metadata.creationTime as number) * 1000;
  }
  if (modifiedJWT.metadata.lastSignInTime) {
    modifiedJWT.metadata.lastSignInTime = (modifiedJWT.metadata.lastSignInTime as number) * 1000;
  }
  if (modifiedJWT.tokensValidAfterTime) {
    modifiedJWT.tokensValidAfterTime = modifiedJWT.tokensValidAfterTime * 1000;
    try {
      const date = new Date(parseInt(modifiedJWT.tokensValidAfterTime, 10));
      if (!isNaN(date.getTime())) {
        modifiedJWT.tokensValidAfterTime = date.toUTCString();
      }
    } catch {
      modifiedJWT.tokensValidAfterTime = null;
    }
  }
  if (modifiedJWT.multiFactor) {
    const modifiedMultiFactor = snakeCase2CamelCase(
      modifiedJWT.multiFactor,
      undefined,
      {enrolled_factors: 'enrolledFactors'}/*) as {enrolledFactors?: DecodedJwtMfaInfo[]}*/
    );
    const parsedEnrolledFactors = [];
    for (const factor of (modifiedMultiFactor.enrolledFactors || [])) {
      const multiFactorInfo = 
    }



    if (modifiedMultiFactor.enrolledFactors.length > 0) {
      modifiedJWT.multiFactor = modifiedMultiFactor;
    } else {
      delete (modifiedJWT as any).multiFactor;
      modifiedJWT.multiFactor = null;
    }
  }


  const userRecord = userRecordConstructor(modifiedJWT);
  return userRecord;




  const modifiedUserRecord: DecodedJwtUserRecordModified = {
    uid: string;
    email?: string;
    emailVerified?: boolean;
    phoneNumber?: string;
    displayName?: string;
    photoURL?: string;
    disabled?: boolean;
    metadata?: any;
    passwordHash?: string;
    passwordSalt?: string;
    providerData?: any;
    multiFactor?: any;
    customClaims?: any;
    tokensValidAfterTime?: number;
    tenantId?: string;
  };




  const metadata = parseMetadata(decodedJWTUserRecord.metadata || {});
  const providerData = parseProviderData(decodedJWTUserRecord.provider_data || []);
  const tokensValidAfterTime = parseValidAfterTime(decodedJWTUserRecord.tokens_valid_after_time); // * 1000
  const multiFactor = parseMultifactor(decodedJWTUserRecord.multi_factor);






  // stub
  const userRecordStub = {
    uid: decodedJWTUserRecord.uid,
    email: decodedJWTUserRecord.email,
    emailVerified: !!decodedJWTUserRecord.email_verified,
    displayName: decodedJWTUserRecord.display_name,
    photoURL: decodedJWTUserRecord.photo_url,
    phoneNumber: decodedJWTUserRecord.phone_number,
    disabled: decodedJWTUserRecord.disabled || false,
    metadata,
    providerData,
    passwordHash: decodedJWTUserRecord.password_hash,
    passwordSalt: decodedJWTUserRecord.password_salt,
    customClaims: decodedJWTUserRecord.custom_claims,
    tokensValidAfterTime,
    tenantId: decodedJWTUserRecord.tenant_id,
    multiFactor,
    toJSON(): () => object
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







/**
 * Converts a snake case object to camel case.
 *
 * @param obj The snake case object.
 * @param filter The optional filter to replace a specific key with another key.
 * @param exclude The map of keys of the branches to exclude and their corresponding
 *     mapped key.
 * @return The camel case representation of this object.
 */
export function snakeCase2CamelCase(
  snakeCase: any, filter?: {[key: string]: string} | null,
  exclude?: {[key: string]: string} | null): any {
let camelCase: any = {};
filter = filter || {};
exclude = exclude || {};
if (Array.isArray(snakeCase)) {
  camelCase = [];
  snakeCase.forEach((value, index) => {
    camelCase[index] = snakeCase2CamelCase(value, filter, exclude);
  });
} else if (typeof snakeCase === 'object' && snakeCase !== null) {
  for (const key in snakeCase) {
    if (snakeCase.hasOwnProperty(key)) {
      if (typeof exclude[key] !== 'undefined') {
        camelCase[exclude[key]] = snakeCase[key];
        continue;
      }
      const modifiedKey = typeof filter[key] !== 'undefined' ? filter[key] : snakeCase2CamelCaseString(key);
      if (snakeCase.hasOwnProperty(key)) {
        camelCase[modifiedKey] = snakeCase2CamelCase(snakeCase[key], filter, exclude);
      }
    }
  }
} else {
  camelCase = snakeCase;
}
return camelCase;
}

/**
 * Returns the camel case representation of the snake case string.
 *
 * @param key The snake case string.
 * @return The camel case equivalent.
 */
export function snakeCase2CamelCaseString(snakeCase: string): string {
  const modifiedKey = [];
  let i = 0;
  while (i < snakeCase.length) {
    if (snakeCase.charAt(i) === '_' &&
        i + 1 < snakeCase.length &&
        i !== 0 &&
        snakeCase.charAt(i - 1) !== '_' &&
        snakeCase.charAt(i + 1) !== '_') {
      modifiedKey.push(snakeCase.charAt(i + 1).toUpperCase());
      i++;
    } else {
      modifiedKey.push(snakeCase.charAt(i));
    }
    i++;
  }
  return modifiedKey.join('');
}





/** MOVED FROM src/providers/auth */
export class UserRecordMetadata implements firebase.auth.UserMetadata {
  constructor(public creationTime: string, public lastSignInTime: string) {}

  /** Returns a plain JavaScript object with the properties of UserRecordMetadata. */
  toJSON() {
    return {
      creationTime: this.creationTime,
      lastSignInTime: this.lastSignInTime,
    };
  }
}

export function userRecordConstructor(
  wireData: Object
): firebase.auth.UserRecord {
  // Falsey values from the wire format proto get lost when converted to JSON, this adds them back.
  const falseyValues: any = {
    email: null,
    emailVerified: false,
    displayName: null,
    photoURL: null,
    phoneNumber: null,
    disabled: false,
    providerData: [],
    customClaims: {},
    passwordSalt: null,
    passwordHash: null,
    tokensValidAfterTime: null,
    tenantId: null,
  };
  const record = _.assign({}, falseyValues, wireData);

  const meta = _.get(record, 'metadata');
  if (meta) {
    _.set(
      record,
      'metadata',
      new UserRecordMetadata(
        meta.createdAt || meta.creationTime,
        meta.lastSignedInAt || meta.lastSignInTime
      )
    );
  } else {
    _.set(record, 'metadata', new UserRecordMetadata(null, null));
  }
  _.forEach(record.providerData, (entry) => {
    _.set(entry, 'toJSON', () => {
      return entry;
    });
  });
  _.set(record, 'toJSON', () => {
    const json: any = _.pick(record, [
      'uid',
      'email',
      'emailVerified',
      'displayName',
      'photoURL',
      'phoneNumber',
      'disabled',
      'passwordHash',
      'passwordSalt',
      'tokensValidAfterTime',
    ]);
    json.metadata = _.get(record, 'metadata').toJSON();
    json.customClaims = _.cloneDeep(record.customClaims);
    json.providerData = _.map(record.providerData, (entry) => entry.toJSON());
    return json;
  });
  return record as firebase.auth.UserRecord;
}