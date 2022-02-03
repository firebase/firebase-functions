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
import * as _ from 'lodash';
import * as jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { HttpsError } from './https';
import { EventContext } from '../../cloud-functions';
import { logger } from '../..';

export { HttpsError };

/** @internal */
export const JWT_CLIENT_CERT_URL = 'https://www.googleapis.com';
/** @internal */
export const JWT_CLIENT_CERT_PATH =
  'robot/v1/metadata/x509/securetoken@system.gserviceaccount.com';
/** @internal */
export const JWT_ALG = 'RS256';
/** @internal */
export const JWT_ISSUER = 'https://securetoken.google.com/';

/** @internal */
const EVENT_MAPPING: Record<string, string> = {
  beforeCreate: 'providers/cloud.auth/eventTypes/user.beforeCreate',
  beforeSignIn: 'providers/cloud.auth/eventTypes/user.beforeSignIn',
};

/**
 * The UserRecord passed to Cloud Functions is the same UserRecord that is returned by the Firebase Admin
 * SDK.
 */
export type UserRecord = firebase.auth.UserRecord;

/**
 * UserInfo that is part of the UserRecord
 */
export type UserInfo = firebase.auth.UserInfo;

/**
 * Additional metadata about the user.
 */
export type UserMetadata = firebase.auth.UserMetadata;

/**
 * The multi-factor related properties for the current user, if available.
 */
export type MultiFactorSettings = firebase.auth.MultiFactorSettings;

/**
 * Interface representing the common properties of a user-enrolled second factor.
 */
export type MultiFactorInfo = firebase.auth.MultiFactorInfo;

/**
 * Interface representing a phone specific user-enrolled second factor.
 */
export type PhoneMultiFactorInfo = firebase.auth.PhoneMultiFactorInfo;

/** The additional user info component of the auth event context */
interface AdditionalUserInfo {
  providerId: string;
  profile?: any;
  username?: string;
  isNewUser: boolean;
}

/** The credential component of the auth event context */
interface Credential {
  claims?: { [key: string]: any };
  idToken?: string;
  accessToken?: string;
  refreshToken?: string;
  expirationTime?: string;
  secret?: string;
  providerId: string;
  signInMethod: string;
}

/** Defines the auth event context for blocking events */
export interface AuthEventContext extends EventContext {
  locale?: string;
  ipAddress: string;
  userAgent: string;
  additionalUserInfo?: AdditionalUserInfo;
  credential?: Credential;
}

/** The handler response type for beforeCreate blocking events */
export interface BeforeCreateResponse {
  displayName?: string;
  disabled?: boolean;
  emailVerified?: boolean;
  photoURL?: string;
  customClaims?: object;
}

/** The handler response type for beforeSignIn blocking events */
export interface BeforeSignInResponse extends BeforeCreateResponse {
  sessionClaims?: object;
}

/** @internal */
interface DecodedJwtMetadata {
  creation_time?: number;
  last_sign_in_time?: number;
}

/** @internal */
interface DecodedJwtUserInfo {
  uid: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  phone_number?: string;
  provider_id: string;
}

/** @internal */
export interface DecodedJwtMfaInfo {
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
export interface DecodedJwtUserRecord {
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
  provider_data?: DecodedJwtUserInfo[];
  multi_factor?: DecodedJwtEnrolledFactors;
  custom_claims?: any;
  tokens_valid_after_time?: number;
  tenant_id?: string;
  [key: string]: any;
}

/** @internal */
export interface DecodedJwt {
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

/**
 * Helper class to create the user metadata in a UserRecord object
 */
export class UserRecordMetadata implements UserMetadata {
  constructor(public creationTime: string, public lastSignInTime: string) {}

  /** Returns a plain JavaScript object with the properties of UserRecordMetadata. */
  toJSON(): object {
    return {
      creationTime: this.creationTime,
      lastSignInTime: this.lastSignInTime,
    };
  }
}

/**
 * Helper class to create the user info in a UserRecord object
 */
export class UserRecordInfo implements UserInfo {
  constructor(
    public uid: string,
    public displayName: string,
    public email: string,
    public photoURL: string,
    public providerId: string,
    public phoneNumber: string
  ) {}

  toJSON(): object {
    return {
      uid: this.uid,
      displayName: this.displayName,
      email: this.email,
      photoURL: this.photoURL,
      providerId: this.providerId,
      phoneNumber: this.phoneNumber,
    };
  }
}

/**
 * Helper class to create the user MultiFactorInfo in a UserRecord object
 */
export class UserRecordMultiFactorInfo
  implements Pick<MultiFactorInfo, keyof MultiFactorInfo> {
  constructor(
    public uid: string,
    public factorId: string,
    public displayName?: string,
    public enrollmentTime?: string
  ) {}

  toJSON(): object {
    return {
      uid: this.uid,
      factorId: this.factorId,
      displayName: this.displayName || null,
      enrollmentTime: this.enrollmentTime || null,
    };
  }
}

/**
 * Helper class to create the user PhoneMultiFactorInfo in a UserRecord object
 */
export class UserRecordPhoneMultiFactorInfo
  implements Pick<PhoneMultiFactorInfo, keyof PhoneMultiFactorInfo> {
  constructor(
    public uid: string,
    public factorId: string,
    public phoneNumber: string,
    public displayName?: string,
    public enrollmentTime?: string
  ) {}

  toJSON(): object {
    return {
      uid: this.uid,
      factorId: this.factorId,
      phoneNumber: this.phoneNumber,
      displayName: this.displayName || null,
      enrollmentTime: this.enrollmentTime || null,
    };
  }
}

/**
 * Helper class to create the user MultiFactorSettings in a UserRecord object
 */
export class UserRecordMultiFactorSettings implements MultiFactorSettings {
  constructor(public enrolledFactors: MultiFactorInfo[]) {}

  toJSON(): object {
    return {
      enrolledFactors: this.enrolledFactors.map((ef) => ef.toJSON()),
    };
  }
}

/**
 * @internal
 * Obtain public keys for use in decoding and verifying the jwt sent from identity platform
 */
export async function fetchPublicKeys(): Promise<Record<string, string>> {
  const url = `${JWT_CLIENT_CERT_URL}/${JWT_CLIENT_CERT_PATH}`;
  try {
    const response = await fetch(url);
    const data = await response.json();
    return data as Record<string, string>;
  } catch (err) {
    logger.error(
      `Failed to obtain public keys for JWT verification: ${err.message}`
    );
    throw new HttpsError('internal', 'Failed to obtain public keys');
  }
}

/**
 * Helper function that creates a UserRecord Class from data sent over the wire.
 * @param wireData data sent over the wire
 * @returns an instance of UserRecord with correct toJSON functions
 */
export function userRecordConstructor(wireData: Object): UserRecord {
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
  return record as UserRecord;
}

/**
 * @internal
 * Checks for a valid identity platform web request, otherwise throws an HttpsError
 */
export function validRequest(req: express.Request): void {
  if (req.method !== 'POST') {
    throw new HttpsError(
      'invalid-argument',
      `Request has invalid method "${req.method}".`
    );
  }

  const contentType: string = (req.header('Content-Type') || '').toLowerCase();
  if (!contentType.includes('application/json')) {
    throw new HttpsError(
      'invalid-argument',
      'Request has invalid header Content-Type.'
    );
  }

  if (!req.body || !req.body.data || !req.body.data.jwt) {
    throw new HttpsError('invalid-argument', 'Request has an invalid body.');
  }
}

/** @internal */
export function getPublicKey(
  header: Record<string, any>,
  publicKeys: Record<string, string>
): string {
  if (header.alg !== JWT_ALG) {
    throw new HttpsError(
      'invalid-argument',
      `Provided JWT has incorrect algorithm. Expected ${JWT_ALG} but got ${header.alg}.`
    );
  }
  if (!header.kid) {
    throw new HttpsError('invalid-argument', 'JWT has no "kid" claim.');
  }
  if (!publicKeys.hasOwnProperty(header.kid)) {
    throw new HttpsError(
      'invalid-argument',
      'Provided JWT has "kid" claim which does not correspond to a known public key. Most likely the JWT is expired.'
    );
  }

  return publicKeys[header.kid];
}

/**
 * @internal
 * Checks for a well forms cloud functions url
 */
export function isAuthorizedCloudFunctionURL(
  cloudFunctionUrl: string,
  projectId: string
): boolean {
  // Region can be:
  // us-central1, us-east1, asia-northeast1, europe-west1, asia-east1.
  // Sample: https://europe-west1-fb-sa-upgraded.cloudfunctions.net/function-1
  const gcf_directions = [
    'central',
    'east',
    'west',
    'south',
    'southeast',
    'northeast',
    // Other possible directions that could be added.
    'north',
    'southwest',
    'northwest',
  ];
  const re = new RegExp(
    `^https://[^-]+-(${gcf_directions.join(
      '|'
    )})[0-9]+-${projectId}\.cloudfunctions\.net/`
  );
  const res = re.exec(cloudFunctionUrl) || [];
  return res.length > 0;
}

/**
 * @internal
 * Checks for errors in a decoded jwt
 */
export function checkDecodedToken(
  decodedJWT: DecodedJwt,
  projectId: string
): void {
  if (!isAuthorizedCloudFunctionURL(decodedJWT.aud, projectId)) {
    throw new HttpsError(
      'invalid-argument',
      'Provided JWT has incorrect "aud" (audience) claim.'
    );
  }
  if (decodedJWT.iss !== `${JWT_ISSUER}${projectId}`) {
    throw new HttpsError(
      'invalid-argument',
      `Provided JWT has incorrect "iss" (issuer) claim. Expected ` +
        `"${JWT_ISSUER}${projectId}" but got "${decodedJWT.iss}".`
    );
  }
  if (typeof decodedJWT.sub !== 'string' || decodedJWT.sub.length === 0) {
    throw new HttpsError(
      'invalid-argument',
      'Provided JWT has no "sub" (subject) claim.'
    );
  }
  if (decodedJWT.sub.length > 128) {
    throw new HttpsError(
      'invalid-argument',
      'Provided JWT has "sub" (subject) claim longer than 128 characters.'
    );
  }
}

/**
 * @internal
 * Verifies the jwt using the 'jwt' library and decodes the token with the public keys
 * Throws an error if the event types do not match
 */
function verifyAndDecodeJWT(
  token: string,
  eventType: string,
  publicKeys: Record<string, string>
) {
  // jwt decode & verify
  // https://github.com/auth0/node-jsonwebtoken#jwtverifytoken-secretorpublickey-options-callback
  const header =
    (jwt.decode(token, { complete: true }) as Record<string, any>).header || {};
  const publicKey = getPublicKey(header, publicKeys);
  const decoded = jwt.verify(token, publicKey, {
    algorithms: [this.algorithm],
  }) as DecodedJwt;
  decoded.uid = decoded.sub;
  checkDecodedToken(decoded, process.env.GCLOUD_PROJECT);

  if (decoded.event_type !== eventType) {
    throw new HttpsError(
      'invalid-argument',
      `Expected "${eventType}" but received "${decoded.event_type}".`
    );
  }
  return decoded;
}

/**
 * @internal
 * Helper function to parse the decoded metadata object into a UserMetaData object
 */
export function parseMetadata(metadata: DecodedJwtMetadata): UserMetadata {
  const creationTime = metadata?.creation_time
    ? new Date((metadata.creation_time as number) * 1000).toUTCString()
    : null;
  const lastSignInTime = metadata?.last_sign_in_time
    ? new Date((metadata.last_sign_in_time as number) * 1000).toUTCString()
    : null;
  return new UserRecordMetadata(creationTime, lastSignInTime);
}

/**
 * @internal
 * Helper function to parse the decoded user info array into a UserInfo array
 */
export function parseProviderData(
  providerData: DecodedJwtUserInfo[]
): UserInfo[] {
  const providers: UserInfo[] = [];
  for (const provider of providerData) {
    providers.push(
      new UserRecordInfo(
        provider.uid,
        provider.display_name,
        provider.email,
        provider.photo_url,
        provider.provider_id,
        provider.phone_number
      )
    );
  }
  return providers;
}

/**
 * @internal
 * Helper function to parse the date into a UTC string
 */
export function parseDate(tokensValidAfterTime?: number): string | null {
  if (!tokensValidAfterTime) {
    return null;
  }
  tokensValidAfterTime = tokensValidAfterTime * 1000;
  try {
    const date = new Date(tokensValidAfterTime);
    if (!isNaN(date.getTime())) {
      return date.toUTCString();
    }
  } catch {
    return null;
  }
  return null;
}

/**
 * @internal
 * Helper function to parse the decoded enrolled factors into a valid MultiFactorSettings
 */
export function parseMultiFactor(
  multiFactor?: DecodedJwtEnrolledFactors
): MultiFactorSettings {
  if (!multiFactor) {
    return null;
  }
  const parsedEnrolledFactors: MultiFactorInfo[] = [];
  for (const factor of multiFactor.enrolled_factors || []) {
    if (!factor.uid) {
      throw new HttpsError(
        'internal',
        'INTERNAL ASSERT FAILED: Invalid multi-factor info response'
      );
    }
    const enrollmentTime = factor.enrollment_time
      ? new Date(factor.enrollment_time).toUTCString()
      : null;
    if (factor.phone_number) {
      parsedEnrolledFactors.push(
        new UserRecordPhoneMultiFactorInfo(
          factor.uid,
          factor.factor_id || 'phone',
          factor.phone_number,
          factor.display_name,
          enrollmentTime
        ) as PhoneMultiFactorInfo
      );
    } else {
      parsedEnrolledFactors.push(
        new UserRecordMultiFactorInfo(
          factor.uid,
          factor.factor_id,
          factor.display_name,
          enrollmentTime
        ) as MultiFactorInfo
      );
    }
  }

  if (parsedEnrolledFactors.length > 0) {
    return new UserRecordMultiFactorSettings(parsedEnrolledFactors);
  }
  return null;
}

/**
 * @internal
 * Parses the decoded user record into a valid UserRecord for use in the handler
 */
export function parseUserRecord(
  decodedJWTUserRecord: DecodedJwtUserRecord
): UserRecord {
  if (!decodedJWTUserRecord.uid) {
    throw new HttpsError(
      'internal',
      'INTERNAL ASSERT FAILED: Invalid user response'
    );
  }

  const disabled = decodedJWTUserRecord.disabled || false;
  const metadata = parseMetadata(decodedJWTUserRecord.metadata);
  const providerData = parseProviderData(decodedJWTUserRecord.provider_data);
  const tokensValidAfterTime = parseDate(
    decodedJWTUserRecord.tokens_valid_after_time
  );
  const multiFactor = parseMultiFactor(decodedJWTUserRecord.multi_factor);

  return {
    uid: decodedJWTUserRecord.uid,
    email: decodedJWTUserRecord.email,
    emailVerified: decodedJWTUserRecord.email_verified,
    displayName: decodedJWTUserRecord.display_name,
    photoURL: decodedJWTUserRecord.photo_url,
    phoneNumber: decodedJWTUserRecord.phone_number,
    disabled,
    metadata,
    providerData,
    passwordHash: decodedJWTUserRecord.password_hash,
    passwordSalt: decodedJWTUserRecord.password_salt,
    customClaims: decodedJWTUserRecord.custom_claims,
    tenantId: decodedJWTUserRecord.tenant_id,
    tokensValidAfterTime,
    multiFactor,
    toJSON: function(): object {
      const json: any = {
        uid: decodedJWTUserRecord.uid,
        email: decodedJWTUserRecord.email,
        emailVerified: decodedJWTUserRecord.email_verified,
        displayName: decodedJWTUserRecord.display_name,
        photoURL: decodedJWTUserRecord.photo_url,
        phoneNumber: decodedJWTUserRecord.phone_number,
        disabled: disabled,
        metadata: metadata.toJSON(),
        providerData: providerData.map((pd) => pd.toJSON()),
        passwordHash: decodedJWTUserRecord.password_hash,
        passwordSalt: decodedJWTUserRecord.password_salt,
        customClaims: decodedJWTUserRecord.custom_claims,
        tenantId: decodedJWTUserRecord.tenant_id,
        tokensValidAfterTime,
        multiFactor: multiFactor.toJSON(),
      };
      return json;
    },
  };
}

/** @internal */
function parseAdditionalUserInfo(decodedJWT: DecodedJwt): AdditionalUserInfo {
  let profile, username;
  if (decodedJWT.raw_user_info)
    try {
      profile = JSON.parse(decodedJWT.raw_user_info);
    } catch (err) {
      logger.debug(`Parse Error: ${err.message}`);
    }
  if (profile) {
    if (decodedJWT.sign_in_method === 'github.com') {
      username = profile.login;
    }
    if (decodedJWT.sign_in_method === 'twitter.com') {
      username = profile.screen_name;
    }
  }

  return {
    providerId:
      decodedJWT.sign_in_method === 'emailLink'
        ? 'password'
        : decodedJWT.sign_in_method,
    profile,
    username,
    isNewUser: decodedJWT.event_type === 'beforeCreate' ? true : false,
  };
}

/** @internal */
function parseAuthCredential(decodedJWT: DecodedJwt, time: number): Credential {
  if (
    !decodedJWT.sign_in_attributes &&
    !decodedJWT.oauth_id_token &&
    !decodedJWT.oauth_access_token &&
    !decodedJWT.oauth_refresh_token
  ) {
    return null;
  }
  return {
    claims: decodedJWT.sign_in_attributes,
    idToken: decodedJWT.oauth_id_token,
    accessToken: decodedJWT.oauth_access_token,
    refreshToken: decodedJWT.oauth_refresh_token,
    expirationTime: decodedJWT.oauth_expires_in
      ? new Date(time + decodedJWT.oauth_expires_in * 1000).toUTCString()
      : undefined,
    secret: decodedJWT.oauth_token_secret,
    providerId:
      decodedJWT.sign_in_method === 'emailLink'
        ? 'password'
        : decodedJWT.sign_in_method,
    signInMethod: decodedJWT.sign_in_method,
  };
}

/**
 * @internal
 * Parses the decoded jwt into a valid AuthEventContext for use in the handler
 */
export function parseAuthEventContext(
  decodedJWT: DecodedJwt,
  projectId: string,
  time: number = new Date().getTime()
): AuthEventContext {
  const eventType =
    (EVENT_MAPPING[decodedJWT.event_type] || decodedJWT.event_type) +
    (decodedJWT.sign_in_method ? `:${decodedJWT.sign_in_method}` : '');

  return {
    locale: decodedJWT.locale,
    ipAddress: decodedJWT.ip_address,
    userAgent: decodedJWT.user_agent,
    eventId: decodedJWT.event_id,
    eventType,
    authType: !!decodedJWT.user_record ? 'USER' : 'UNAUTHENTICATED',
    resource: {
      // TODO(colerogers): figure out the correct service
      service: 'identitytoolkit.googleapis.com',
      name: !!decodedJWT.tenant_id
        ? `projects/${projectId}/tenants/${decodedJWT.tenant_id}`
        : `projects/${projectId}`,
    },
    timestamp: new Date(decodedJWT.iat * 1000).toUTCString(),
    additionalUserInfo: parseAdditionalUserInfo(decodedJWT),
    credential: parseAuthCredential(decodedJWT, time),
    params: {},
  };
}

/**
 * @internal
 * Checks the handler response for invalid customClaims & sessionClaims objects
 */
export function validateAuthResponse(
  eventType: string,
  authRequest?: BeforeCreateResponse | BeforeSignInResponse
) {
  const nonAllowListedClaims = [
    'acr',
    'amr',
    'at_hash',
    'aud',
    'auth_time',
    'azp',
    'cnf',
    'c_hash',
    'exp',
    'iat',
    'iss',
    'jti',
    'nbf',
    'nonce',
    'firebase',
  ];
  const claimsMaxPayloadSize = 1000;

  if (!authRequest) {
    authRequest = {};
  }
  if (authRequest.customClaims) {
    const invalidClaims = nonAllowListedClaims.filter((claim) =>
      authRequest.customClaims.hasOwnProperty(claim)
    );
    if (invalidClaims.length > 0) {
      throw new HttpsError(
        'invalid-argument',
        `The customClaims claims "${invalidClaims.join(
          ','
        )}" are reserved and cannot be specified.`
      );
    }
    if (
      JSON.stringify(authRequest.customClaims).length > claimsMaxPayloadSize
    ) {
      throw new HttpsError(
        'invalid-argument',
        `The customClaims payload should not exceed ${claimsMaxPayloadSize} characters.`
      );
    }
  }
  if (
    eventType === 'beforeSignIn' &&
    (authRequest as BeforeSignInResponse).sessionClaims
  ) {
    const invalidClaims = nonAllowListedClaims.filter((claim) =>
      (authRequest as BeforeSignInResponse).sessionClaims.hasOwnProperty(claim)
    );
    if (invalidClaims.length > 0) {
      throw new HttpsError(
        'invalid-argument',
        `The sessionClaims claims "${invalidClaims.join(
          ','
        )}" are reserved and cannot be specified.`
      );
    }
    if (
      JSON.stringify((authRequest as BeforeSignInResponse).sessionClaims)
        .length > claimsMaxPayloadSize
    ) {
      throw new HttpsError(
        'invalid-argument',
        `The sessionClaims payload should not exceed ${claimsMaxPayloadSize} characters.`
      );
    }
    const combinedClaims = {
      ...authRequest.customClaims,
      ...(authRequest as BeforeSignInResponse).sessionClaims,
    };
    if (JSON.stringify(combinedClaims).length > claimsMaxPayloadSize) {
      throw new HttpsError(
        'invalid-argument',
        `The customClaims and sessionClaims payloads should not exceed ${claimsMaxPayloadSize} characters combined.`
      );
    }
  }
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
  };
}

/** @internal */
function wrapHandler(
  handler: (
    user: UserRecord,
    context: AuthEventContext
  ) =>
    | BeforeCreateResponse
    | Promise<BeforeCreateResponse>
    | BeforeSignInResponse
    | Promise<BeforeSignInResponse>
    | void
    | Promise<void>,
  eventType: string
  // publicKeys: Record<string, string> = {}
) {
  return async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const publicKeys = await fetchPublicKeys();
      validRequest(req);
      const decodedJWT = verifyAndDecodeJWT(
        req.body.data.jwt,
        eventType,
        publicKeys
      );
      const userRecord = parseUserRecord(decodedJWT.user_record);
      const authEventContext = parseAuthEventContext(
        decodedJWT,
        process.env.GCLOUD_PROJECT
      );
      const authResponse =
        (await handler(userRecord, authEventContext)) || undefined;
      validateAuthResponse(eventType, authResponse);
      const updateMask = generateUpdateMask(authResponse, {
        customClaims: true,
        sessionClaims: true,
      });
      const result = {
        userRecord: {
          ...authResponse,
          updateMask: updateMask.join(','),
        },
      };
      // const result = encode(finalizedRequest);

      res.status(200);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(result));
    } catch (err) {
      if (!(err instanceof HttpsError)) {
        // This doesn't count as an 'explicit' error.
        logger.error('Unhandled error', err);
        err = new HttpsError('internal', 'An unexpected error occurred.');
      }

      res.status(err.code);
      res.setHeader('Content-Type', 'application/json');
      res.send(JSON.stringify(err.toJSON()));
    }
  };
}

/**
 * @internal
 * Generates the update mask for the provided object.
 * Note this will ignore the last key with value undefined.
 *
 * @param obj The object to generate the update mask for.
 * @param maxPaths The optional map of keys for maximum paths to traverse.
 *      Nested objects beyond that path will be ignored.
 * @param currentPath The path so far.
 * @return The computed update mask list.
 */
export function generateUpdateMask(
  obj: any,
  maxPaths: { [key: string]: boolean } = {},
  currentPath: string = ''
): string[] {
  const updateMask: string[] = [];
  if (!obj) {
    return updateMask;
  }
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && typeof obj[key] !== 'undefined') {
      const nextPath = currentPath ? currentPath + '.' + key : key;
      // We hit maximum path.
      if (maxPaths[nextPath]) {
        // Add key and stop traversing this branch.
        updateMask.push(key);
      } else {
        let maskList: string[] = [];
        maskList = generateUpdateMask(obj[key], maxPaths, nextPath);
        if (maskList.length > 0) {
          maskList.forEach((mask) => {
            updateMask.push(`${key}.${mask}`);
          });
        } else {
          updateMask.push(key);
        }
      }
    }
  }
  return updateMask;
}
