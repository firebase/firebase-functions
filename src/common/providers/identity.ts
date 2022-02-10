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
import { SUPPORTED_REGIONS } from '../../function-configuration';
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
export interface PublicKeysCache {
  publicKeys: Record<string, string>;
  publicKeysExpireAt?: number;
}

const CLAIMS_NON_ALLOW_LISTED = [
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

const CLAIMS_MAX_PAYLOAD_SIZE = 1000;

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
 * Helper class to create the user metadata in a UserRecord object
 */
export class UserRecordMetadata implements firebase.auth.UserMetadata {
  constructor(public creationTime: string, public lastSignInTime: string) {}

  /** Returns a plain JavaScript object with the properties of UserRecordMetadata. */
  toJSON(): AuthUserMetadata {
    return {
      creationTime: this.creationTime,
      lastSignInTime: this.lastSignInTime,
    };
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
 * User info that is part of the AuthUserRecord
 */
export interface AuthUserInfo {
  /**
   * The user identifier for the linked provider.
   */
  uid: string;
  /**
   * The display name for the linked provider.
   */
  displayName: string;
  /**
   * The email for the linked provider.
   */
  email: string;
  /**
   * The photo URL for the linked provider.
   */
  photoURL: string;
  /**
   * The linked provider ID (for example, "google.com" for the Google provider).
   */
  providerId: string;
  /**
   * The phone number for the linked provider.
   */
  phoneNumber: string;
}

/**
 * Additional metadata about the user.
 */
export interface AuthUserMetadata {
  /**
   * The date the user was created, formatted as a UTC string.
   */
  creationTime: string;
  /**
   * The date the user last signed in, formatted as a UTC string.
   */
  lastSignInTime: string;
}

/**
 * Interface representing the common properties of a user-enrolled second factor.
 */
export interface AuthMultiFactorInfo {
  /**
   * The ID of the enrolled second factor. This ID is unique to the user.
   */
  uid: string;
  /**
   * The optional display name of the enrolled second factor.
   */
  displayName?: string;
  /**
   * The type identifier of the second factor. For SMS second factors, this is `phone`.
   */
  factorId: string;
  /**
   * The optional date the second factor was enrolled, formatted as a UTC string.
   */
  enrollmentTime?: string;
  /**
   * The phone number associated with a phone second factor.
   */
  phoneNumber?: string;
}

/**
 * The multi-factor related properties for the current user, if available.
 */
export interface AuthMultiFactorSettings {
  /**
   * List of second factors enrolled with the current user.
   */
  enrolledFactors: AuthMultiFactorInfo[];
}

/**
 * The UserRecord passed to auth blocking Cloud Functions from the identity platform.
 */
export interface AuthUserRecord {
  /**
   * The user's `uid`.
   */
  uid: string;
  /**
   * The user's primary email, if set.
   */
  email?: string;
  /**
   * Whether or not the user's primary email is verified.
   */
  emailVerified: boolean;
  /**
   * The user's display name.
   */
  displayName?: string;
  /**
   * The user's photo URL.
   */
  photoURL?: string;
  /**
   * The user's primary phone number, if set.
   */
  phoneNumber?: string;
  /**
   * Whether or not the user is disabled: `true` for disabled; `false` for
   * enabled.
   */
  disabled: boolean;
  /**
   * Additional metadata about the user.
   */
  metadata: AuthUserMetadata;
  /**
   * An array of providers (for example, Google, Facebook) linked to the user.
   */
  providerData: AuthUserInfo[];
  /**
   * The user's hashed password (base64-encoded).
   */
  passwordHash?: string;
  /**
   * The user's password salt (base64-encoded).
   */
  passwordSalt?: string;
  /**
   * The user's custom claims object if available, typically used to define
   * user roles and propagated to an authenticated user's ID token.
   */
  customClaims?: Record<string, any>;
  /**
   * The ID of the tenant the user belongs to, if available.
   */
  tenantId?: string | null;
  /**
   * The date the user's tokens are valid after, formatted as a UTC string.
   */
  tokensValidAfterTime?: string;
  /**
   * The multi-factor related properties for the current user, if available.
   */
  multiFactor?: AuthMultiFactorSettings;
}

/** The additional user info component of the auth event context */
export interface AdditionalUserInfo {
  providerId: string;
  profile?: any;
  username?: string;
  isNewUser: boolean;
}

/** The credential component of the auth event context */
export interface Credential {
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

interface DecodedJwtMetadata {
  creation_time?: number;
  last_sign_in_time?: number;
}

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
export interface DecodedJWT {
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
 * @internal
 * Helper to determine if we refresh the public keys
 */
export function invalidPublicKeys(
  keys: PublicKeysCache,
  time: number = Date.now()
): boolean {
  if (!keys.publicKeysExpireAt) {
    return true;
  }
  return time >= keys.publicKeysExpireAt;
}

/**
 * @internal
 * Helper to parse the response headers to obtain the expiration time.
 */
export function setKeyExpirationTime(
  response: any,
  keysCache: PublicKeysCache,
  time: number
): void {
  if (response.headers.has('cache-control')) {
    const ccHeader = response.headers.get('cache-control');
    const maxAgeEntry = ccHeader
      .split(', ')
      .find((item) => item.includes('max-age'));
    if (maxAgeEntry) {
      const maxAge = +maxAgeEntry.trim().split('=')[1];
      keysCache.publicKeysExpireAt = time + maxAge * 1000;
    }
  }
}

/**
 * Fetch the public keys for use in decoding and verifying the jwt sent from identity platform.
 */
async function refreshPublicKeys(
  keysCache: PublicKeysCache,
  time: number = Date.now()
): Promise<void> {
  const url = `${JWT_CLIENT_CERT_URL}/${JWT_CLIENT_CERT_PATH}`;
  try {
    const response = await fetch(url);
    setKeyExpirationTime(response, keysCache, time);
    const data = await response.json();
    keysCache.publicKeys = data as Record<string, string>;
  } catch (err) {
    logger.error(
      `Failed to obtain public keys for JWT verification: ${err.message}`
    );
    throw new HttpsError(
      'internal',
      'Failed to obtain the public keys for JWT verification.'
    );
  }
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

  if (!req.body?.data?.jwt) {
    throw new HttpsError('invalid-argument', 'Request has an invalid body.');
  }
}

/** @internal */
export function getPublicKeyFromHeader(
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
    throw new HttpsError('invalid-argument', 'JWT header missing "kid" claim.');
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
  const re = new RegExp(
    `^https://(${SUPPORTED_REGIONS.join(
      '|'
    )})+-${projectId}\.cloudfunctions\.net/`
  );
  const res = re.exec(cloudFunctionUrl) || [];
  return res.length > 0;
}

/**
 * @internal
 * Checks for errors in a decoded jwt
 */
export function checkDecodedToken(
  decodedJWT: DecodedJWT,
  eventType: string,
  projectId: string
): void {
  if (decodedJWT.event_type !== eventType) {
    throw new HttpsError(
      'invalid-argument',
      `Expected "${eventType}" but received "${decodedJWT.event_type}".`
    );
  }
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
  // set uid to sub
  decodedJWT.uid = decodedJWT.sub;
}

/**
 * @internal
 * Helper function to decode the jwt, internally uses the 'jsonwebtoken' package.
 */
export function decodeJWT(token: string): Record<string, any> {
  let decoded: Record<string, any>;
  try {
    decoded = jwt.decode(token, { complete: true }) as Record<string, any>;
  } catch (err) {
    logger.error('Decoding the JWT failed', err);
    throw new HttpsError('internal', 'Failed to decode the JWT.');
  }
  if (!decoded?.payload) {
    throw new HttpsError(
      'internal',
      'The decoded JWT is not structured correctly.'
    );
  }
  return decoded;
}

/**
 * @internal
 * Helper function to determine if we need to do full verification of the jwt
 */
export function shouldVerifyJWT(): boolean {
  // TODO(colerogers): add emulator support to skip verification
  return true;
}

/**
 * @internal
 * Verifies the jwt using the 'jwt' library and decodes the token with the public keys
 * Throws an error if the event types do not match
 */
export function verifyJWT(
  token: string,
  rawDecodedJWT: Record<string, any>,
  keysCache: PublicKeysCache,
  time: number = Date.now()
): DecodedJWT {
  if (!rawDecodedJWT.header) {
    throw new HttpsError(
      'internal',
      'Unable to verify JWT payload, the decoded JWT does not have a header property.'
    );
  }
  const header = rawDecodedJWT.header;
  if (invalidPublicKeys(keysCache, time)) {
    refreshPublicKeys(keysCache);
  }
  let publicKey = getPublicKeyFromHeader(header, keysCache.publicKeys);
  try {
    return jwt.verify(token, publicKey, {
      algorithms: [JWT_ALG],
    }) as DecodedJWT;
  } catch (err) {
    logger.error('Verifying the JWT failed', err);
  }
  // force refresh keys and retry one more time
  refreshPublicKeys(keysCache);
  publicKey = getPublicKeyFromHeader(header, keysCache.publicKeys);
  try {
    return jwt.verify(token, publicKey, {
      algorithms: [JWT_ALG],
    }) as DecodedJWT;
  } catch (err) {
    logger.error('Verifying the JWT failed again', err);
    throw new HttpsError('internal', 'Failed to verify the JWT.');
  }
}

/**
 * @internal
 * Helper function to parse the decoded metadata object into a UserMetaData object
 */
export function parseMetadata(metadata: DecodedJwtMetadata): AuthUserMetadata {
  const creationTime = metadata?.creation_time
    ? new Date((metadata.creation_time as number) * 1000).toUTCString()
    : null;
  const lastSignInTime = metadata?.last_sign_in_time
    ? new Date((metadata.last_sign_in_time as number) * 1000).toUTCString()
    : null;
  return {
    creationTime,
    lastSignInTime,
  };
}

/**
 * @internal
 * Helper function to parse the decoded user info array into an AuthUserInfo array
 */
export function parseProviderData(
  providerData: DecodedJwtUserInfo[]
): AuthUserInfo[] {
  const providers: AuthUserInfo[] = [];
  for (const provider of providerData) {
    providers.push({
      uid: provider.uid,
      displayName: provider.display_name,
      email: provider.email,
      photoURL: provider.photo_url,
      providerId: provider.provider_id,
      phoneNumber: provider.phone_number,
    });
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
  } catch {}
  return null;
}

/**
 * @internal
 * Helper function to parse the decoded enrolled factors into a valid MultiFactorSettings
 */
export function parseMultiFactor(
  multiFactor?: DecodedJwtEnrolledFactors
): AuthMultiFactorSettings {
  if (!multiFactor) {
    return null;
  }
  const parsedEnrolledFactors: AuthMultiFactorInfo[] = [];
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
    parsedEnrolledFactors.push({
      uid: factor.uid,
      factorId: factor.phone_number
        ? factor.factor_id || 'phone'
        : factor.factor_id,
      displayName: factor.display_name,
      enrollmentTime,
      phoneNumber: factor.phone_number,
    });
  }

  if (parsedEnrolledFactors.length > 0) {
    return {
      enrolledFactors: parsedEnrolledFactors,
    };
  }
  return null;
}

/**
 * @internal
 * Parses the decoded user record into a valid UserRecord for use in the handler
 */
export function parseAuthUserRecord(
  decodedJWTUserRecord: DecodedJwtUserRecord
): AuthUserRecord {
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
  };
}

/** Helper to get the AdditionalUserInfo from the decoded jwt */
function parseAdditionalUserInfo(decodedJWT: DecodedJWT): AdditionalUserInfo {
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

/** Helper to get the Credential from the decoded jwt */
function parseAuthCredential(decodedJWT: DecodedJWT, time: number): Credential {
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
  decodedJWT: DecodedJWT,
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
  if (!authRequest) {
    authRequest = {};
  }
  if (authRequest.customClaims) {
    const invalidClaims = CLAIMS_NON_ALLOW_LISTED.filter((claim) =>
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
      JSON.stringify(authRequest.customClaims).length > CLAIMS_MAX_PAYLOAD_SIZE
    ) {
      throw new HttpsError(
        'invalid-argument',
        `The customClaims payload should not exceed ${CLAIMS_MAX_PAYLOAD_SIZE} characters.`
      );
    }
  }
  if (
    eventType === 'beforeSignIn' &&
    (authRequest as BeforeSignInResponse).sessionClaims
  ) {
    const invalidClaims = CLAIMS_NON_ALLOW_LISTED.filter((claim) =>
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
        .length > CLAIMS_MAX_PAYLOAD_SIZE
    ) {
      throw new HttpsError(
        'invalid-argument',
        `The sessionClaims payload should not exceed ${CLAIMS_MAX_PAYLOAD_SIZE} characters.`
      );
    }
    const combinedClaims = {
      ...authRequest.customClaims,
      ...(authRequest as BeforeSignInResponse).sessionClaims,
    };
    if (JSON.stringify(combinedClaims).length > CLAIMS_MAX_PAYLOAD_SIZE) {
      throw new HttpsError(
        'invalid-argument',
        `The customClaims and sessionClaims payloads should not exceed ${CLAIMS_MAX_PAYLOAD_SIZE} characters combined.`
      );
    }
  }
}

/**
 * @internal
 * Helper function to generate the update mask for the identity platform changed values
 */
export function getUpdateMask(
  authResponse?: BeforeCreateResponse | BeforeSignInResponse
): string {
  if (!authResponse) {
    return '';
  }
  const updateMask: string[] = [];
  for (const key in authResponse) {
    if (key === 'customClaims' || key === 'sessionClaims') {
      continue;
    }
    if (
      authResponse.hasOwnProperty(key) &&
      typeof authResponse[key] !== 'undefined'
    ) {
      updateMask.push(key);
    }
  }
  return updateMask.join(',');
}

/** @internal */
export function createHandler(
  handler: (
    user: AuthUserRecord,
    context: AuthEventContext
  ) =>
    | BeforeCreateResponse
    | Promise<BeforeCreateResponse>
    | BeforeSignInResponse
    | Promise<BeforeSignInResponse>
    | void
    | Promise<void>,
  eventType: string,
  keysCache: PublicKeysCache
): (req: express.Request, resp: express.Response) => Promise<void> {
  const wrappedHandler = wrapHandler(handler, eventType, keysCache);
  return (req: express.Request, res: express.Response) => {
    return new Promise((resolve) => {
      res.on('finish', resolve);
      resolve(wrappedHandler(req, res));
    });
  };
}

function wrapHandler(
  handler: (
    user: AuthUserRecord,
    context: AuthEventContext
  ) =>
    | BeforeCreateResponse
    | Promise<BeforeCreateResponse>
    | BeforeSignInResponse
    | Promise<BeforeSignInResponse>
    | void
    | Promise<void>,
  eventType: string,
  keysCache: PublicKeysCache
) {
  return async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const projectId = process.env.GCLOUD_PROJECT;
      validRequest(req);
      const rawDecodedJWT = decodeJWT(req.body.data.jwt);
      const decodedJWT = shouldVerifyJWT()
        ? verifyJWT(req.body.data.jwt, rawDecodedJWT, keysCache)
        : (rawDecodedJWT.payload as DecodedJWT);
      checkDecodedToken(decodedJWT, eventType, projectId);
      const authUserRecord = parseAuthUserRecord(decodedJWT.user_record);
      const authEventContext = parseAuthEventContext(decodedJWT, projectId);
      const authResponse =
        (await handler(authUserRecord, authEventContext)) || undefined;
      validateAuthResponse(eventType, authResponse);
      const updateMask = getUpdateMask(authResponse);
      const result = {
        userRecord: {
          ...authResponse,
          updateMask,
        },
      };

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
