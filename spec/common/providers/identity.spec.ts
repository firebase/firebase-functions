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

import { expect } from "chai";
import * as express from "express";
import * as identity from "../../../src/common/providers/identity";

const EVENT = "EVENT_TYPE";
const now = new Date();
const TEST_NAME = "John Doe";
const ALLOW = "ALLOW";
const BLOCK = "BLOCK";

describe("identity", () => {
  describe("userRecordConstructor", () => {
    it("will provide falsey values for fields that are not in raw wire data", () => {
      const record = identity.userRecordConstructor({ uid: "123" });
      expect(record.toJSON()).to.deep.equal({
        uid: "123",
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
        metadata: {
          creationTime: null,
          lastSignInTime: null,
        },
      });
    });

    it("will not interfere with fields that are in raw wire data", () => {
      const raw: any = {
        uid: "123",
        email: "email@gmail.com",
        emailVerified: true,
        displayName: "User",
        photoURL: "url",
        phoneNumber: "1233332222",
        disabled: true,
        providerData: [],
        customClaims: {},
        passwordSalt: "abc",
        passwordHash: "def",
        tokensValidAfterTime: "2027-02-02T23:01:19.797Z",
        metadata: {
          creationTime: "2017-02-02T23:06:26.124Z",
          lastSignInTime: "2017-02-02T23:01:19.797Z",
        },
      };
      const record = identity.userRecordConstructor(raw);
      expect(record.toJSON()).to.deep.equal(raw);
    });

    it("will convert raw wire fields createdAt and lastSignedInAt to creationTime and lastSignInTime", () => {
      const raw: any = {
        uid: "123",
        metadata: {
          createdAt: "2017-02-02T23:06:26.124Z",
          lastSignedInAt: "2017-02-02T23:01:19.797Z",
        },
      };
      const record = identity.userRecordConstructor(raw);
      expect(record.metadata).to.deep.equal({
        creationTime: "2017-02-02T23:06:26.124Z",
        lastSignInTime: "2017-02-02T23:01:19.797Z",
      });
    });

    it("should stringify the record", () => {
      const raw: any = {
        uid: "123",
        email: "email@gmail.com",
        emailVerified: true,
        displayName: "User",
        photoURL: "url",
        phoneNumber: "1233332222",
        disabled: true,
        providerData: ["something"],
        customClaims: {
          claim: "value",
          another: {
            inner: "value",
          },
        },
        passwordSalt: "abc",
        passwordHash: "def",
        tokensValidAfterTime: "2027-02-02T23:01:19.797Z",
        metadata: {
          creationTime: "2017-02-02T23:06:26.124Z",
          lastSignInTime: "2017-02-02T23:01:19.797Z",
        },
      };
      const record = identity.userRecordConstructor(raw);
      expect(() => JSON.stringify(record)).to.not.throw;
    });
  });

  describe("isValidRequest", () => {
    it("should error on non-post", () => {
      const req = {
        method: "GET",
        header: {
          "Content-Type": "application/json",
        },
        body: {
          data: {
            jwt: "1.2.3",
          },
        },
      } as unknown as express.Request;

      expect(identity.isValidRequest(req)).to.be.false;
    });

    it("should error on bad Content-Type", () => {
      const req = {
        method: "POST",
        header() {
          return "text/css";
        },
        body: {
          data: {
            jwt: "1.2.3",
          },
        },
      } as unknown as express.Request;

      expect(identity.isValidRequest(req)).to.be.false;
    });

    it("should error without req body", () => {
      const req = {
        method: "POST",
        header() {
          return "application/json";
        },
      } as unknown as express.Request;

      expect(identity.isValidRequest(req)).to.be.false;
    });

    it("should error without req body data", () => {
      const req = {
        method: "POST",
        header() {
          return "application/json";
        },
        body: {},
      } as unknown as express.Request;

      expect(identity.isValidRequest(req)).to.be.false;
    });

    it("should error without req body", () => {
      const req = {
        method: "POST",
        header() {
          return "application/json";
        },
        body: {
          data: {},
        },
      } as unknown as express.Request;

      expect(identity.isValidRequest(req)).to.be.false;
    });

    it("should not error on valid request", () => {
      const req = {
        method: "POST",
        header() {
          return "application/json";
        },
        body: {
          data: {
            jwt: "1.2.3",
          },
        },
      } as unknown as express.Request;

      expect(identity.isValidRequest(req)).to.be.true;
    });
  });

  describe("parseMetadata", () => {
    const decodedMetadata = {
      last_sign_in_time: 1476235905000,
      creation_time: 1476136676000,
    };
    const metadata = {
      lastSignInTime: new Date(1476235905000).toUTCString(),
      creationTime: new Date(1476136676000).toUTCString(),
    };

    it("should parse an undefined object", () => {
      expect(identity.parseMetadata({})).to.deep.equal({
        creationTime: null,
        lastSignInTime: null,
      });
    });

    it("should parse a decoded metadata object", () => {
      const md = identity.parseMetadata(decodedMetadata);

      expect(md).to.deep.equal(metadata);
    });
  });

  describe("parseProviderData", () => {
    const decodedUserInfo = {
      provider_id: "google.com",
      display_name: TEST_NAME,
      photo_url: "https://lh3.googleusercontent.com/1234567890/photo.jpg",
      uid: "1234567890",
      email: "user@gmail.com",
    };
    const userInfo = {
      providerId: "google.com",
      displayName: TEST_NAME,
      photoURL: "https://lh3.googleusercontent.com/1234567890/photo.jpg",
      uid: "1234567890",
      email: "user@gmail.com",
      phoneNumber: undefined,
    };
    const decodedUserInfoPhone = {
      provider_id: "phone",
      phone_number: "+11234567890",
      uid: "+11234567890",
    };
    const userInfoPhone = {
      providerId: "phone",
      displayName: undefined,
      photoURL: undefined,
      uid: "+11234567890",
      email: undefined,
      phoneNumber: "+11234567890",
    };

    it("should parse the user info", () => {
      expect(identity.parseProviderData([decodedUserInfo])).to.deep.equal([userInfo]);
    });

    it("should parse the user info with phone", () => {
      expect(identity.parseProviderData([decodedUserInfoPhone])).to.deep.equal([userInfoPhone]);
    });
  });

  describe("parseDate", () => {
    it("should return null if tokens undefined", () => {
      expect(identity.parseDate()).to.be.null;
    });

    it("should parse the date", () => {
      expect(identity.parseDate(1476136676)).to.equal(new Date(1476136676000).toUTCString());
    });
  });

  describe("parseMultiFactor", () => {
    const decodedMultiFactors = {
      enrolled_factors: [
        {
          uid: "enrollmentId1",
          display_name: "displayName1",
          enrollment_time: now.toISOString(),
          phone_number: "+16505551234",
        },
        {
          uid: "enrollmentId2",
          enrollment_time: now.toISOString(),
        },
      ],
    };
    const multiFactors = {
      enrolledFactors: [
        {
          uid: "enrollmentId1",
          displayName: "displayName1",
          enrollmentTime: now.toUTCString(),
          phoneNumber: "+16505551234",
          factorId: "phone",
        },
        {
          uid: "enrollmentId2",
          displayName: undefined,
          enrollmentTime: now.toUTCString(),
          factorId: undefined,
          phoneNumber: undefined,
        },
      ],
    };

    it("should return null on undefined factor", () => {
      expect(identity.parseMultiFactor()).to.be.null;
    });

    it("should return null without enrolled factors", () => {
      expect(identity.parseMultiFactor({})).to.be.null;
    });

    it("should error on an invalid factor", () => {
      const factors = {
        enrolled_factors: [{} as identity.DecodedPayloadMfaInfo],
      };

      expect(() => identity.parseMultiFactor(factors)).to.throw(
        "INTERNAL ASSERT FAILED: Invalid multi-factor info response"
      );
    });

    it("should correctly parse factors", () => {
      expect(identity.parseMultiFactor(decodedMultiFactors)).to.deep.equal(multiFactors);
    });
  });

  describe("parseUserRecord", () => {
    const decodedUserRecord = {
      uid: "abcdefghijklmnopqrstuvwxyz",
      email: "user@gmail.com",
      email_verified: true,
      display_name: TEST_NAME,
      phone_number: "+11234567890",
      provider_data: [
        {
          provider_id: "google.com",
          display_name: TEST_NAME,
          photo_url: "https://lh3.googleusercontent.com/1234567890/photo.jpg",
          email: "user@gmail.com",
          uid: "1234567890",
        },
        {
          provider_id: "facebook.com",
          display_name: "John Smith",
          photo_url: "https://facebook.com/0987654321/photo.jpg",
          email: "user@facebook.com",
          uid: "0987654321",
        },
        {
          provider_id: "phone",
          uid: "+11234567890",
          phone_number: "+11234567890",
        },
        {
          provider_id: "password",
          email: "user@gmail.com",
          uid: "user@gmail.com",
          display_name: TEST_NAME,
        },
      ],
      password_hash: "passwordHash",
      password_salt: "passwordSalt",
      photo_url: "https://lh3.googleusercontent.com/1234567890/photo.jpg",
      tokens_valid_after_time: 1476136676,
      metadata: {
        last_sign_in_time: 1476235905000,
        creation_time: 1476136676000,
      },
      custom_claims: {
        admin: true,
        group_id: "group123",
      },
      tenant_id: "TENANT_ID",
      multi_factor: {
        enrolled_factors: [
          {
            uid: "enrollmentId1",
            display_name: "displayName1",
            enrollment_time: now.toISOString(),
            phone_number: "+16505551234",
            factor_id: "phone",
          },
          {
            uid: "enrollmentId2",
            enrollment_time: now.toISOString(),
            phone_number: "+16505556789",
            factor_id: "phone",
          },
        ],
      },
    };

    const userRecord = {
      uid: "abcdefghijklmnopqrstuvwxyz",
      email: "user@gmail.com",
      phoneNumber: "+11234567890",
      emailVerified: true,
      disabled: false,
      displayName: TEST_NAME,
      providerData: [
        {
          providerId: "google.com",
          displayName: TEST_NAME,
          photoURL: "https://lh3.googleusercontent.com/1234567890/photo.jpg",
          email: "user@gmail.com",
          uid: "1234567890",
          phoneNumber: undefined,
        },
        {
          providerId: "facebook.com",
          displayName: "John Smith",
          photoURL: "https://facebook.com/0987654321/photo.jpg",
          email: "user@facebook.com",
          uid: "0987654321",
          phoneNumber: undefined,
        },
        {
          providerId: "phone",
          displayName: undefined,
          photoURL: undefined,
          email: undefined,
          uid: "+11234567890",
          phoneNumber: "+11234567890",
        },
        {
          providerId: "password",
          displayName: TEST_NAME,
          photoURL: undefined,
          email: "user@gmail.com",
          uid: "user@gmail.com",
          phoneNumber: undefined,
        },
      ],
      passwordHash: "passwordHash",
      passwordSalt: "passwordSalt",
      photoURL: "https://lh3.googleusercontent.com/1234567890/photo.jpg",
      metadata: {
        lastSignInTime: new Date(1476235905000).toUTCString(),
        creationTime: new Date(1476136676000).toUTCString(),
      },
      customClaims: {
        admin: true,
        group_id: "group123",
      },
      tokensValidAfterTime: new Date(1476136676000).toUTCString(),
      tenantId: "TENANT_ID",
      multiFactor: {
        enrolledFactors: [
          {
            uid: "enrollmentId1",
            displayName: "displayName1",
            enrollmentTime: now.toUTCString(),
            phoneNumber: "+16505551234",
            factorId: "phone",
          },
          {
            uid: "enrollmentId2",
            displayName: undefined,
            enrollmentTime: now.toUTCString(),
            phoneNumber: "+16505556789",
            factorId: "phone",
          },
        ],
      },
    };

    it("should error if decoded does not have uid", () => {
      expect(() => identity.parseAuthUserRecord({} as identity.DecodedPayloadUserRecord)).to.throw(
        "INTERNAL ASSERT FAILED: Invalid user response"
      );
    });

    it("should parse user record", () => {
      const ur = identity.parseAuthUserRecord(decodedUserRecord);

      expect(ur).to.deep.equal(userRecord);
    });
  });

  describe("parseAuthEventContext", () => {
    const TEST_RECAPTCHA_SCORE = 0.9;
    const rawUserInfo = {
      name: TEST_NAME,
      granted_scopes:
        "openid https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile",
      id: "123456789",
      verified_email: true,
      given_name: "John",
      locale: "en",
      family_name: "Doe",
      email: "johndoe@gmail.com",
      picture: "https://lh3.googleusercontent.com/1233456789/mo/photo.jpg",
    };

    it("should parse an unknown event", () => {
      const decodedJwt = {
        aud: "https://us-east1-project_id.cloudfunctions.net/function-1",
        exp: 60 * 60 + 1,
        iat: 1,
        iss: "https://securetoken.google.com/project_id",
        sub: "someUid",
        uid: "someUid",
        event_id: "EVENT_ID",
        event_type: EVENT,
        ip_address: "1.2.3.4",
        user_agent: "USER_AGENT",
        locale: "en",
        raw_user_info: JSON.stringify(rawUserInfo),
        recaptcha_score: TEST_RECAPTCHA_SCORE,
      };
      const context = {
        locale: "en",
        ipAddress: "1.2.3.4",
        userAgent: "USER_AGENT",
        eventId: "EVENT_ID",
        eventType: EVENT,
        authType: "UNAUTHENTICATED",
        resource: {
          service: "identitytoolkit.googleapis.com",
          name: "projects/project-id",
        },
        timestamp: new Date(1000).toUTCString(),
        additionalUserInfo: {
          providerId: undefined,
          profile: rawUserInfo,
          username: undefined,
          isNewUser: false,
          recaptchaScore: TEST_RECAPTCHA_SCORE,
        },
        credential: null,
        params: {},
      };

      expect(identity.parseAuthEventContext(decodedJwt, "project-id")).to.deep.equal(context);
    });

    it("should parse a beforeSignIn event", () => {
      const time = now.getTime();
      const decodedJwt = {
        aud: "https://us-east1-project_id.cloudfunctions.net/function-1",
        exp: 60 * 60 + 1,
        iat: 1,
        iss: "https://securetoken.google.com/project_id",
        sub: "someUid",
        uid: "someUid",
        event_id: "EVENT_ID",
        event_type: "beforeSignIn",
        ip_address: "1.2.3.4",
        user_agent: "USER_AGENT",
        locale: "en",
        sign_in_method: "password",
        raw_user_info: JSON.stringify(rawUserInfo),
        oauth_id_token: "ID_TOKEN",
        oauth_access_token: "ACCESS_TOKEN",
        oauth_refresh_token: "REFRESH_TOKEN",
        oauth_token_secret: "OAUTH_TOKEN_SECRET",
        oauth_expires_in: 3600,
        recaptcha_score: TEST_RECAPTCHA_SCORE,
      };
      const context = {
        locale: "en",
        ipAddress: "1.2.3.4",
        userAgent: "USER_AGENT",
        eventId: "EVENT_ID",
        eventType: "providers/cloud.auth/eventTypes/user.beforeSignIn:password",
        authType: "UNAUTHENTICATED",
        resource: {
          service: "identitytoolkit.googleapis.com",
          name: "projects/project-id",
        },
        timestamp: new Date(1000).toUTCString(),
        additionalUserInfo: {
          providerId: "password",
          profile: rawUserInfo,
          username: undefined,
          isNewUser: false,
          recaptchaScore: TEST_RECAPTCHA_SCORE,
        },
        credential: {
          claims: undefined,
          idToken: "ID_TOKEN",
          accessToken: "ACCESS_TOKEN",
          refreshToken: "REFRESH_TOKEN",
          expirationTime: new Date(time + 3600 * 1000).toUTCString(),
          secret: "OAUTH_TOKEN_SECRET",
          providerId: "password",
          signInMethod: "password",
        },
        params: {},
      };

      expect(identity.parseAuthEventContext(decodedJwt, "project-id", time)).to.deep.equal(context);
    });

    it("should parse a beforeCreate event", () => {
      const time = now.getTime();
      // beforeCreate
      const decodedJwt = {
        aud: "https://us-east1-project_id.cloudfunctions.net/beforeCreate",
        exp: 60 * 60 + 1,
        iat: 1,
        iss: "https://securetoken.google.com/project_id",
        sub: "abcdefghijklmnopqrstuvwxyz",
        uid: "abcdefghijklmnopqrstuvwxyz",
        event_id: "EVENT_ID",
        event_type: "beforeCreate",
        ip_address: "1.2.3.4",
        user_agent: "USER_AGENT",
        locale: "en",
        sign_in_method: "oidc.provider",
        tenant_id: "TENANT_ID",
        user_record: {
          uid: "abcdefghijklmnopqrstuvwxyz",
          email: "user@gmail.com",
          email_verified: true,
          display_name: TEST_NAME,
          phone_number: "+11234567890",
          provider_data: [
            {
              provider_id: "oidc.provider",
              email: "user@gmail.com",
              uid: "user@gmail.com",
              display_name: TEST_NAME,
            },
          ],
          photo_url: "https://lh3.googleusercontent.com/1234567890/photo.jpg",
          tokens_valid_after_time: 1476136676,
          metadata: {
            last_sign_in_time: 1476235905000,
            creation_time: 1476136676000,
          },
          custom_claims: {
            admin: true,
            group_id: "group123",
          },
          tenant_id: "TENANT_ID",
        },
        oauth_id_token: "ID_TOKEN",
        oauth_access_token: "ACCESS_TOKEN",
        oauth_refresh_token: "REFRESH_TOKEN",
        oauth_token_secret: "OAUTH_TOKEN_SECRET",
        oauth_expires_in: 3600,
        raw_user_info: JSON.stringify(rawUserInfo),
        recaptcha_score: TEST_RECAPTCHA_SCORE,
      };
      const context = {
        locale: "en",
        ipAddress: "1.2.3.4",
        userAgent: "USER_AGENT",
        eventId: "EVENT_ID",
        eventType: "providers/cloud.auth/eventTypes/user.beforeCreate:oidc.provider",
        authType: "USER",
        resource: {
          service: "identitytoolkit.googleapis.com",
          name: "projects/project-id/tenants/TENANT_ID",
        },
        timestamp: new Date(1000).toUTCString(),
        additionalUserInfo: {
          username: undefined,
          providerId: "oidc.provider",
          profile: rawUserInfo,
          isNewUser: true,
          recaptchaScore: TEST_RECAPTCHA_SCORE,
        },
        credential: {
          claims: undefined,
          accessToken: "ACCESS_TOKEN",
          expirationTime: new Date(time + 3600 * 1000).toUTCString(),
          idToken: "ID_TOKEN",
          providerId: "oidc.provider",
          refreshToken: "REFRESH_TOKEN",
          secret: "OAUTH_TOKEN_SECRET",
          signInMethod: "oidc.provider",
        },
        params: {},
      };

      expect(identity.parseAuthEventContext(decodedJwt, "project-id", time)).to.deep.equal(context);
    });
  });

  describe("validateAuthResponse", () => {
    it("should not throw on undefined request", () => {
      expect(() => identity.validateAuthResponse("event", undefined)).to.not.throw;
    });

    it("should throw an error if customClaims have a blocked claim", () => {
      expect(() =>
        identity.validateAuthResponse("beforeCreate", {
          customClaims: { acr: "something" },
        })
      ).to.throw('The customClaims claims "acr" are reserved and cannot be specified.');
    });

    it("should throw an error if customClaims size is too big", () => {
      const str = "x".repeat(1000);

      expect(() =>
        identity.validateAuthResponse("beforeCreate", {
          customClaims: { idk: str },
        })
      ).to.throw("The customClaims payload should not exceed 1000 characters.");
    });

    it("should throw an error if sessionClaims have a blocked claim", () => {
      expect(() =>
        identity.validateAuthResponse("beforeSignIn", {
          sessionClaims: { acr: "something" },
        })
      ).to.throw('The sessionClaims claims "acr" are reserved and cannot be specified.');
    });

    it("should throw an error if sessionClaims size is too big", () => {
      const str = "x".repeat(1000);

      expect(() =>
        identity.validateAuthResponse("beforeSignIn", {
          sessionClaims: { idk: str },
        })
      ).to.throw("The sessionClaims payload should not exceed 1000 characters.");
    });

    it("should throw an error if the combined customClaims & sessionClaims size is too big", () => {
      const str = "x".repeat(501);

      expect(() =>
        identity.validateAuthResponse("beforeSignIn", {
          customClaims: { cc: str },
          sessionClaims: { sc: str },
        })
      ).to.throw(
        "The customClaims and sessionClaims payloads should not exceed 1000 characters combined."
      );
    });
  });

  describe("getUpdateMask", () => {
    it("should return empty string on undefined response", () => {
      expect(identity.getUpdateMask()).to.eq("");
    });

    it("should return the right claims on a response", () => {
      const response = {
        displayName: "john",
        disabled: false,
        emailVerified: true,
        photoURL: "google.com",
        customClaims: {
          claim1: "abc",
        },
        sessionClaims: {
          claim2: "def",
        },
      };

      expect(identity.getUpdateMask(response)).to.eq(
        "displayName,disabled,emailVerified,photoURL,customClaims,sessionClaims"
      );
    });
  });

  describe("generateResponsePayload", () => {
    const DISPLAY_NAME_FIELD = "displayName";
    const TEST_RESPONSE = {
      displayName: TEST_NAME,
      recaptchaActionOverride: BLOCK,
    } as identity.BeforeCreateResponse;

    const EXPECT_PAYLOAD = {
      userRecord: { displayName: TEST_NAME, updateMask: DISPLAY_NAME_FIELD },
      recaptchaActionOverride: BLOCK,
    };

    const TEST_RESPONSE_RECAPTCHA_ALLOW = {
      recaptchaActionOverride: ALLOW,
    } as identity.BeforeCreateResponse;

    const EXPECT_PAYLOAD_RECAPTCHA_ALLOW = {
      recaptchaActionOverride: ALLOW,
    };

    const TEST_RESPONSE_RECAPTCHA_UNDEFINED = {
      displayName: TEST_NAME,
    } as identity.BeforeSignInResponse;

    const EXPECT_PAYLOAD_UNDEFINED = {
      userRecord: { displayName: TEST_NAME, updateMask: DISPLAY_NAME_FIELD },
    };
    it("should return empty object on undefined response", () => {
      expect(identity.generateResponsePayload()).to.eql({});
    });

    it("should exclude recaptchaActionOverride field from updateMask", () => {
      expect(identity.generateResponsePayload(TEST_RESPONSE)).to.deep.equal(EXPECT_PAYLOAD);
    });

    it("should return recaptchaActionOverride when it is true on response", () => {
      expect(identity.generateResponsePayload(TEST_RESPONSE_RECAPTCHA_ALLOW)).to.deep.equal(
        EXPECT_PAYLOAD_RECAPTCHA_ALLOW
      );
    });

    it("should not return recaptchaActionOverride if undefined", () => {
      const payload = identity.generateResponsePayload(TEST_RESPONSE_RECAPTCHA_UNDEFINED);
      expect(payload.hasOwnProperty("recaptchaActionOverride")).to.be.false;
      expect(payload).to.deep.equal(EXPECT_PAYLOAD_UNDEFINED);
    });
  });
});
