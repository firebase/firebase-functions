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
import * as auth from "firebase-admin/auth";
import * as logger from "../../logger";
import { EventContext } from "../../v1/cloud-functions";
import { getApp } from "../app";
import { isDebugFeatureEnabled } from "../debug";
import { HttpsError, unsafeDecodeToken } from "./https";

export { HttpsError };

const DISALLOWED_CUSTOM_CLAIMS = [
  "acr",
  "amr",
  "at_hash",
  "aud",
  "auth_time",
  "azp",
  "cnf",
  "c_hash",
  "exp",
  "iat",
  "iss",
  "jti",
  "nbf",
  "nonce",
  "firebase",
];

const CLAIMS_MAX_PAYLOAD_SIZE = 1000;

/**
 * Shorthand auth blocking events from GCIP.
 * @hidden
 * @alpha
 */
export type AuthBlockingEventType =
  | "beforeCreate"
  | "beforeSignIn"
  | "beforeSendEmail"
  | "beforeSendSms";

const EVENT_MAPPING: Record<string, string> = {
  beforeCreate: "providers/cloud.auth/eventTypes/user.beforeCreate",
  beforeSignIn: "providers/cloud.auth/eventTypes/user.beforeSignIn",
  beforeSendEmail: "providers/cloud.auth/eventTypes/user.beforeSendEmail",
  beforeSendSms: "providers/cloud.auth/eventTypes/user.beforeSendSms",
};

/**
 * The `UserRecord` passed to Cloud Functions is the same
 * {@link https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth.userrecord | UserRecord}
 * that is returned by the Firebase Admin SDK.
 */
export type UserRecord = auth.UserRecord;

/**
 * `UserInfo` that is part of the `UserRecord`.
 */
export type UserInfo = auth.UserInfo;

/**
 * Helper class to create the user metadata in a `UserRecord` object.
 */
export class UserRecordMetadata implements auth.UserMetadata {
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
 * Helper function that creates a `UserRecord` class from data sent over the wire.
 * @param wireData data sent over the wire
 * @returns an instance of `UserRecord` with correct toJSON functions
 */
export function userRecordConstructor(wireData: Record<string, unknown>): UserRecord {
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
  const record = { ...falseyValues, ...wireData };

  const meta = record.metadata;
  if (meta) {
    record.metadata = new UserRecordMetadata(
      meta.createdAt || meta.creationTime,
      meta.lastSignedInAt || meta.lastSignInTime
    );
  } else {
    record.metadata = new UserRecordMetadata(null, null);
  }
  record.toJSON = () => {
    const {
      uid,
      email,
      emailVerified,
      displayName,
      photoURL,
      phoneNumber,
      disabled,
      passwordHash,
      passwordSalt,
      tokensValidAfterTime,
    } = record;
    const json: Record<string, unknown> = {
      uid,
      email,
      emailVerified,
      displayName,
      photoURL,
      phoneNumber,
      disabled,
      passwordHash,
      passwordSalt,
      tokensValidAfterTime,
    };
    json.metadata = record.metadata.toJSON();
    json.customClaims = JSON.parse(JSON.stringify(record.customClaims));
    json.providerData = record.providerData.map((entry) => {
      const newEntry = { ...entry };
      newEntry.toJSON = () => entry;
      return newEntry;
    });
    return json;
  };
  return record as UserRecord;
}

/**
 * User info that is part of the `AuthUserRecord`.
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
 * The `UserRecord` passed to auth blocking functions from the identity platform.
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
  providerId?: string;
  profile?: any;
  username?: string;
  isNewUser: boolean;
  recaptchaScore?: number;
  email?: string;
  phoneNumber?: string;
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

/**
 * Possible types of emails as described by the GCIP backend, which can be:
 * - A sign-in email
 * - A password reset email
 */
export type EmailType = "EMAIL_SIGN_IN" | "PASSWORD_RESET";

/**
 * The type of SMS message, which can be:
 * - A sign-in or sign up SMS message
 * - A multi-factor sign-in SMS message
 * - A multi-factor enrollment SMS message
 */
export type SmsType = "SIGN_IN_OR_SIGN_UP" | "MULTI_FACTOR_SIGN_IN" | "MULTI_FACTOR_ENROLLMENT";

/** Defines the auth event context for blocking events */
export interface AuthEventContext extends EventContext {
  locale?: string;
  ipAddress: string;
  userAgent: string;
  additionalUserInfo?: AdditionalUserInfo;
  credential?: Credential;
  emailType?: EmailType;
  smsType?: SmsType;
}

/** Defines the auth event for 2nd gen blocking events */
export interface AuthBlockingEvent extends AuthEventContext {
  data?: AuthUserRecord; // will be undefined for beforeEmailSent and beforeSmsSent event types
}

/** The reCAPTCHA action options. */
export type RecaptchaActionOptions = "ALLOW" | "BLOCK";

/** The handler response type for `beforeEmailSent` blocking events */
export interface BeforeEmailResponse {
  recaptchaActionOverride?: RecaptchaActionOptions;
}

/** The handler response type for `beforeSmsSent` blocking events */
export interface BeforeSmsResponse {
  recaptchaActionOverride?: RecaptchaActionOptions;
}

/** The handler response type for `beforeCreate` blocking events */
export interface BeforeCreateResponse {
  displayName?: string;
  disabled?: boolean;
  emailVerified?: boolean;
  photoURL?: string;
  customClaims?: object;
  recaptchaActionOverride?: RecaptchaActionOptions;
}

/** The handler response type for `beforeSignIn` blocking events */
export interface BeforeSignInResponse extends BeforeCreateResponse {
  sessionClaims?: object;
}

interface DecodedPayloadUserRecordMetadata {
  creation_time?: number;
  last_sign_in_time?: number;
}

interface DecodedPayloadUserRecordUserInfo {
  uid: string;
  display_name?: string;
  email?: string;
  photo_url?: string;
  phone_number?: string;
  provider_id: string;
}

/** @internal */
export interface DecodedPayloadMfaInfo {
  uid: string;
  display_name?: string;
  phone_number?: string;
  enrollment_time?: string;
  factor_id?: string;
}

interface DecodedPayloadUserRecordEnrolledFactors {
  enrolled_factors?: DecodedPayloadMfaInfo[];
}

/** @internal */
export interface DecodedPayloadUserRecord {
  uid: string;
  email?: string;
  email_verified?: boolean;
  phone_number?: string;
  display_name?: string;
  photo_url?: string;
  disabled?: boolean;
  metadata?: DecodedPayloadUserRecordMetadata;
  password_hash?: string;
  password_salt?: string;
  provider_data?: DecodedPayloadUserRecordUserInfo[];
  multi_factor?: DecodedPayloadUserRecordEnrolledFactors;
  custom_claims?: any;
  tokens_valid_after_time?: number;
  tenant_id?: string;
  [key: string]: any;
}

/** @internal */
export interface DecodedPayload {
  aud: string;
  exp: number;
  iat: number;
  iss: string;
  sub?: string;
  event_id: string;
  event_type: string;
  ip_address: string;
  user_agent?: string;
  locale?: string;
  sign_in_method?: string;
  user_record?: DecodedPayloadUserRecord;
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
  recaptcha_score?: number;
  email?: string;
  email_type?: string;
  phone_number?: string;
  sms_type?: string;
  [key: string]: any;
}

/**
 * Internal definition to include all the fields that can be sent as
 * a response from the blocking function to the backend.
 * This is added mainly to have a type definition for 'generateResponsePayload'
  @internal */
export interface ResponsePayload {
  userRecord?: UserRecordResponsePayload;
  recaptchaActionOverride?: RecaptchaActionOptions;
}

/** @internal */
export interface UserRecordResponsePayload
  extends Omit<BeforeSignInResponse, "recaptchaActionOverride"> {
  updateMask?: string;
}

export type MaybeAsync<T> = T | Promise<T>;

// N.B. As we add support for new auth blocking functions, some auth blocking event handlers
// will not receive a user record object. However, we can't make the user record parameter
// optional because it is listed before the required context parameter.
export type HandlerV1 = (
  userOrContext: AuthUserRecord | AuthEventContext,
  context?: AuthEventContext
) => MaybeAsync<
  BeforeCreateResponse | BeforeSignInResponse | BeforeEmailResponse | BeforeSmsResponse | void
>;

export type HandlerV2 = (
  event: AuthBlockingEvent
) => MaybeAsync<
  BeforeCreateResponse | BeforeSignInResponse | BeforeEmailResponse | BeforeSmsResponse | void
>;

export type AuthBlockingEventHandler = (HandlerV1 | HandlerV2) & {
  // Specify the GCF gen of the trigger that the auth blocking event handler was written for
  platform: "gcfv1" | "gcfv2";
};

/**
 * Checks for a valid identity platform web request, otherwise throws an HttpsError.
 * @internal
 */
export function isValidRequest(req: express.Request): boolean {
  if (req.method !== "POST") {
    logger.warn(`Request has invalid method "${req.method}".`);
    return false;
  }

  const contentType: string = (req.header("Content-Type") || "").toLowerCase();
  if (!contentType.includes("application/json")) {
    logger.warn("Request has invalid header Content-Type.");
    return false;
  }

  if (!req.body?.data?.jwt) {
    logger.warn("Request has an invalid body.");
    return false;
  }
  return true;
}

/**
 * Decode, but not verify, an Auth Blocking token.
 *
 * Do not use in production. Token should always be verified using the Admin SDK.
 *
 * This is exposed only for testing.
 */
function unsafeDecodeAuthBlockingToken(token: string): DecodedPayload {
  const decoded = unsafeDecodeToken(token) as DecodedPayload;
  decoded.uid = decoded.sub;
  return decoded;
}

/**
 * Helper function to parse the decoded metadata object into a `UserMetaData` object
 * @internal
 */
export function parseMetadata(metadata: DecodedPayloadUserRecordMetadata): AuthUserMetadata {
  const creationTime = metadata?.creation_time
    ? new Date(metadata.creation_time).toUTCString()
    : null;
  const lastSignInTime = metadata?.last_sign_in_time
    ? new Date(metadata.last_sign_in_time).toUTCString()
    : null;
  return {
    creationTime,
    lastSignInTime,
  };
}

/**
 * Helper function to parse the decoded user info array into an `AuthUserInfo` array.
 * @internal
 */
export function parseProviderData(
  providerData: DecodedPayloadUserRecordUserInfo[]
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
 * Helper function to parse the date into a UTC string.
 * @internal
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
    // ignore error
  }
  return null;
}

/**
 * Helper function to parse the decoded enrolled factors into a valid MultiFactorSettings
 * @internal
 */
export function parseMultiFactor(
  multiFactor?: DecodedPayloadUserRecordEnrolledFactors
): AuthMultiFactorSettings {
  if (!multiFactor) {
    return null;
  }
  const parsedEnrolledFactors: AuthMultiFactorInfo[] = [];
  for (const factor of multiFactor.enrolled_factors || []) {
    if (!factor.uid) {
      throw new HttpsError(
        "internal",
        "INTERNAL ASSERT FAILED: Invalid multi-factor info response"
      );
    }
    const enrollmentTime = factor.enrollment_time
      ? new Date(factor.enrollment_time).toUTCString()
      : null;
    parsedEnrolledFactors.push({
      uid: factor.uid,
      factorId: factor.phone_number ? factor.factor_id || "phone" : factor.factor_id,
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
 * Parses the decoded user record into a valid UserRecord for use in the handler
 * @internal
 */
export function parseAuthUserRecord(
  decodedJWTUserRecord: DecodedPayloadUserRecord
): AuthUserRecord {
  if (!decodedJWTUserRecord.uid) {
    throw new HttpsError("internal", "INTERNAL ASSERT FAILED: Invalid user response");
  }

  const disabled = decodedJWTUserRecord.disabled || false;
  const metadata = parseMetadata(decodedJWTUserRecord.metadata);
  const providerData = parseProviderData(decodedJWTUserRecord.provider_data);
  const tokensValidAfterTime = parseDate(decodedJWTUserRecord.tokens_valid_after_time);
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

/** Helper to get the `AdditionalUserInfo` from the decoded JWT */
function parseAdditionalUserInfo(decodedJWT: DecodedPayload): AdditionalUserInfo {
  let profile;
  let username;
  if (decodedJWT.raw_user_info) {
    try {
      profile = JSON.parse(decodedJWT.raw_user_info);
    } catch (err) {
      logger.debug(`Parse Error: ${err.message}`);
    }
  }
  if (profile) {
    if (decodedJWT.sign_in_method === "github.com") {
      username = profile.login;
    }
    if (decodedJWT.sign_in_method === "twitter.com") {
      username = profile.screen_name;
    }
  }

  return {
    providerId: decodedJWT.sign_in_method === "emailLink" ? "password" : decodedJWT.sign_in_method,
    profile,
    username,
    isNewUser: decodedJWT.event_type === "beforeCreate" ? true : false,
    recaptchaScore: decodedJWT.recaptcha_score,
    email: decodedJWT.email,
    phoneNumber: decodedJWT.phone_number,
  };
}

/**
 * Helper to generate a response from the blocking function to the Firebase Auth backend.
 * @internal
 */
export function generateResponsePayload(
  authResponse?: BeforeCreateResponse | BeforeSignInResponse
): ResponsePayload {
  if (!authResponse) {
    return {};
  }

  const { recaptchaActionOverride, ...formattedAuthResponse } = authResponse;
  const result = {} as ResponsePayload;
  const updateMask = getUpdateMask(formattedAuthResponse);

  if (updateMask.length !== 0) {
    result.userRecord = {
      ...formattedAuthResponse,
      updateMask,
    };
  }

  if (recaptchaActionOverride !== undefined) {
    result.recaptchaActionOverride = recaptchaActionOverride;
  }

  return result;
}

/** Helper to get the Credential from the decoded JWT */
function parseAuthCredential(decodedJWT: DecodedPayload, time: number): Credential {
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
    providerId: decodedJWT.sign_in_method === "emailLink" ? "password" : decodedJWT.sign_in_method,
    signInMethod: decodedJWT.sign_in_method,
  };
}

/**
 * Parses the decoded jwt into a valid AuthEventContext for use in the handler
 * @internal
 */
export function parseAuthEventContext(
  decodedJWT: DecodedPayload,
  projectId: string,
  time: number = new Date().getTime()
): AuthEventContext {
  const eventType =
    (EVENT_MAPPING[decodedJWT.event_type] || decodedJWT.event_type) +
    (decodedJWT.sign_in_method ? `:${decodedJWT.sign_in_method}` : "");

  return {
    locale: decodedJWT.locale,
    ipAddress: decodedJWT.ip_address,
    userAgent: decodedJWT.user_agent,
    eventId: decodedJWT.event_id,
    eventType,
    authType: decodedJWT.user_record ? "USER" : "UNAUTHENTICATED",
    resource: {
      // TODO(colerogers): figure out the correct service
      service: "identitytoolkit.googleapis.com",
      name: decodedJWT.tenant_id
        ? `projects/${projectId}/tenants/${decodedJWT.tenant_id}`
        : `projects/${projectId}`,
    },
    timestamp: new Date(decodedJWT.iat * 1000).toUTCString(),
    additionalUserInfo: parseAdditionalUserInfo(decodedJWT),
    credential: parseAuthCredential(decodedJWT, time),
    emailType: decodedJWT.email_type as EmailType,
    smsType: decodedJWT.sms_type as SmsType,
    params: {},
  };
}

/**
 * Checks the handler response for invalid customClaims & sessionClaims objects
 * @internal
 */
export function validateAuthResponse(
  eventType: string,
  authRequest?: BeforeCreateResponse | BeforeSignInResponse
) {
  if (!authRequest) {
    authRequest = {};
  }
  if (authRequest.customClaims) {
    const invalidClaims = DISALLOWED_CUSTOM_CLAIMS.filter((claim) =>
      authRequest.customClaims.hasOwnProperty(claim)
    );
    if (invalidClaims.length > 0) {
      throw new HttpsError(
        "invalid-argument",
        `The customClaims claims "${invalidClaims.join(",")}" are reserved and cannot be specified.`
      );
    }
    if (JSON.stringify(authRequest.customClaims).length > CLAIMS_MAX_PAYLOAD_SIZE) {
      throw new HttpsError(
        "invalid-argument",
        `The customClaims payload should not exceed ${CLAIMS_MAX_PAYLOAD_SIZE} characters.`
      );
    }
  }
  if (eventType === "beforeSignIn" && (authRequest as BeforeSignInResponse).sessionClaims) {
    const invalidClaims = DISALLOWED_CUSTOM_CLAIMS.filter((claim) =>
      (authRequest as BeforeSignInResponse).sessionClaims.hasOwnProperty(claim)
    );
    if (invalidClaims.length > 0) {
      throw new HttpsError(
        "invalid-argument",
        `The sessionClaims claims "${invalidClaims.join(
          ","
        )}" are reserved and cannot be specified.`
      );
    }
    if (
      JSON.stringify((authRequest as BeforeSignInResponse).sessionClaims).length >
      CLAIMS_MAX_PAYLOAD_SIZE
    ) {
      throw new HttpsError(
        "invalid-argument",
        `The sessionClaims payload should not exceed ${CLAIMS_MAX_PAYLOAD_SIZE} characters.`
      );
    }
    const combinedClaims = {
      ...authRequest.customClaims,
      ...(authRequest as BeforeSignInResponse).sessionClaims,
    };
    if (JSON.stringify(combinedClaims).length > CLAIMS_MAX_PAYLOAD_SIZE) {
      throw new HttpsError(
        "invalid-argument",
        `The customClaims and sessionClaims payloads should not exceed ${CLAIMS_MAX_PAYLOAD_SIZE} characters combined.`
      );
    }
  }
}

/**
 * Helper function to generate the update mask for the identity platform changed values
 * @internal
 */
export function getUpdateMask(authResponse?: BeforeCreateResponse | BeforeSignInResponse): string {
  if (!authResponse) {
    return "";
  }
  const updateMask: string[] = [];
  for (const key in authResponse) {
    if (authResponse.hasOwnProperty(key) && typeof authResponse[key] !== "undefined") {
      updateMask.push(key);
    }
  }
  return updateMask.join(",");
}

/** @internal */
export function wrapHandler(eventType: AuthBlockingEventType, handler: AuthBlockingEventHandler) {
  return async (req: express.Request, res: express.Response): Promise<void> => {
    try {
      const projectId = process.env.GCLOUD_PROJECT;
      if (!isValidRequest(req)) {
        logger.error("Invalid request, unable to process");
        throw new HttpsError("invalid-argument", "Bad Request");
      }

      if (!auth.getAuth(getApp())._verifyAuthBlockingToken) {
        throw new Error(
          "Cannot validate Auth Blocking token. Please update Firebase Admin SDK to >= v10.1.0"
        );
      }

      const decodedPayload: DecodedPayload = isDebugFeatureEnabled("skipTokenVerification")
        ? unsafeDecodeAuthBlockingToken(req.body.data.jwt)
        : handler.platform === "gcfv1"
        ? await auth.getAuth(getApp())._verifyAuthBlockingToken(req.body.data.jwt)
        : await auth.getAuth(getApp())._verifyAuthBlockingToken(req.body.data.jwt, "run.app");
      let authUserRecord: AuthUserRecord | undefined;
      if (
        decodedPayload.event_type === "beforeCreate" ||
        decodedPayload.event_type === "beforeSignIn"
      ) {
        authUserRecord = parseAuthUserRecord(decodedPayload.user_record);
      }
      const authEventContext = parseAuthEventContext(decodedPayload, projectId);

      let authResponse;
      if (handler.platform === "gcfv1") {
        authResponse = authUserRecord
          ? (await (handler as HandlerV1)(authUserRecord, authEventContext)) || undefined
          : (await (handler as HandlerV1)(authEventContext)) || undefined;
      } else {
        authResponse =
          (await (handler as HandlerV2)({
            ...authEventContext,
            data: authUserRecord,
          } as AuthBlockingEvent)) || undefined;
      }

      validateAuthResponse(eventType, authResponse);
      const result = generateResponsePayload(authResponse);

      res.status(200);
      res.setHeader("Content-Type", "application/json");
      res.send(JSON.stringify(result));
    } catch (err) {
      let httpErr: HttpsError = err;
      if (!(httpErr instanceof HttpsError)) {
        // This doesn't count as an 'explicit' error.
        logger.error("Unhandled error", err);
        httpErr = new HttpsError("internal", "An unexpected error occurred.");
      }

      const { status } = httpErr.httpErrorCode;
      const body = { error: httpErr.toJSON() };
      res.setHeader("Content-Type", "application/json");
      res.status(status).send(body);
    }
  };
}
