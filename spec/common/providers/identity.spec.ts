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
// import * as firebase from 'firebase-admin';
// import * as sinon from 'sinon';

import * as identity from '../../../src/common/providers/identity';
import { expect } from 'chai';
// import { MockRequest } from '../../fixtures/mockrequest';

const PROJECT = 'my-project';
const VALID_URL = `https://us-central1-${PROJECT}.cloudfunctions.net/function-1`;

const now = new Date();
const DECODED_USER_RECORD = {
  uid: 'abcdefghijklmnopqrstuvwxyz',
  email: 'user@gmail.com',
  email_verified: true,
  display_name: 'John Doe',
  phone_number: '+11234567890',
  provider_data: [
    {
      provider_id: 'google.com',
      display_name: 'John Doe',
      photo_url: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
      email: 'user@gmail.com',
      uid: '1234567890',
    },
    {
      provider_id: 'facebook.com',
      display_name: 'John Smith',
      photo_url: 'https://facebook.com/0987654321/photo.jpg',
      email: 'user@facebook.com',
      uid: '0987654321',
    },
    {
      provider_id: 'phone',
      uid: '+11234567890',
      phone_number: '+11234567890',
    },
    {
      provider_id: 'password',
      email: 'user@gmail.com',
      uid: 'user@gmail.com',
      display_name: 'John Doe',
    },
  ],
  password_hash: 'passwordHash',
  password_salt: 'passwordSalt',
  photo_url: 'https://lh3.googleusercontent.com/1234567890/photo.jpg',
  tokens_valid_after_time: 1476136676,
  metadata: {
    last_sign_in_time: 1476235905,
    creation_time: 1476136676,
  },
  custom_claims: {
    admin: true,
    group_id: 'group123',
  },
  tenant_id: 'TENANT_ID',
  multi_factor: {
    enrolled_factors: [
      {
        uid: 'enrollmentId1',
        display_name: 'displayName1',
        enrollment_time: now.toISOString(),
        phone_number: '+16505551234',
        factor_id: 'phone',
      },
      {
        uid: 'enrollmentId2',
        enrollment_time: now.toISOString(),
        phone_number: '+16505556789',
        factor_id: 'phone',
      },
    ],
  },
};

describe('identity', () => {
  before(() => {
    process.env.GCLOUD_PROJECT = PROJECT;
  });

  after(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  describe('userRecordConstructor', () => {
    it('will provide falsey values for fields that are not in raw wire data', () => {
      const record = identity.userRecordConstructor({ uid: '123' });
      expect(record.toJSON()).to.deep.equal({
        uid: '123',
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

    it('will not interfere with fields that are in raw wire data', () => {
      const raw: any = {
        uid: '123',
        email: 'email@gmail.com',
        emailVerified: true,
        displayName: 'User',
        photoURL: 'url',
        phoneNumber: '1233332222',
        disabled: true,
        providerData: [],
        customClaims: {},
        passwordSalt: 'abc',
        passwordHash: 'def',
        tokensValidAfterTime: '2027-02-02T23:01:19.797Z',
        metadata: {
          creationTime: '2017-02-02T23:06:26.124Z',
          lastSignInTime: '2017-02-02T23:01:19.797Z',
        },
      };
      const record = identity.userRecordConstructor(raw);
      expect(record.toJSON()).to.deep.equal(raw);
    });

    it('will convert raw wire fields createdAt and lastSignedInAt to creationTime and lastSignInTime', () => {
      const raw: any = {
        uid: '123',
        metadata: {
          createdAt: '2017-02-02T23:06:26.124Z',
          lastSignedInAt: '2017-02-02T23:01:19.797Z',
        },
      };
      const record = identity.userRecordConstructor(raw);
      expect(record.metadata).to.deep.equal({
        creationTime: '2017-02-02T23:06:26.124Z',
        lastSignInTime: '2017-02-02T23:01:19.797Z',
      });
    });
  });

  describe('validRequest', () => {
    it('should error on non-post', () => {
      const req = ({
        method: 'GET',
        header: {
          'Content-Type': 'application/json',
        },
        body: {
          data: {
            jwt: '1.2.3',
          },
        },
      } as unknown) as express.Request;

      expect(() => identity.validRequest(req)).to.throw(
        'Request has invalid method "GET".'
      );
    });

    it('should error on bad Content-Type', () => {
      const req = ({
        method: 'POST',
        header(val: string) {
          return 'text/css';
        },
        body: {
          data: {
            jwt: '1.2.3',
          },
        },
      } as unknown) as express.Request;

      expect(() => identity.validRequest(req)).to.throw(
        'Request has invalid header Content-Type.'
      );
    });

    it('should error without req body', () => {
      const req = ({
        method: 'POST',
        header(val: string) {
          return 'application/json';
        },
      } as unknown) as express.Request;

      expect(() => identity.validRequest(req)).to.throw(
        'Request has an invalid body.'
      );
    });

    it('should error without req body data', () => {
      const req = ({
        method: 'POST',
        header(val: string) {
          return 'application/json';
        },
        body: {},
      } as unknown) as express.Request;

      expect(() => identity.validRequest(req)).to.throw(
        'Request has an invalid body.'
      );
    });

    it('should error without req body', () => {
      const req = ({
        method: 'POST',
        header(val: string) {
          return 'application/json';
        },
        body: {
          data: {},
        },
      } as unknown) as express.Request;

      expect(() => identity.validRequest(req)).to.throw(
        'Request has an invalid body.'
      );
    });

    it('should not error on valid request', () => {
      const req = ({
        method: 'POST',
        header(val: string) {
          return 'application/json';
        },
        body: {
          data: {
            jwt: '1.2.3',
          },
        },
      } as unknown) as express.Request;

      expect(() => identity.validRequest(req)).to.not.throw();
    });
  });

  describe('getPublicKey', () => {
    it('should throw if header.alg is not expected', () => {
      expect(() => identity.getPublicKey({ alg: 'RS128' }, {})).to.throw(
        `Provided JWT has incorrect algorithm. Expected ${identity.JWT_ALG} but got RS128.`
      );
    });

    it('should throw if header.kid is undefined', () => {
      expect(() =>
        identity.getPublicKey({ alg: identity.JWT_ALG }, {})
      ).to.throw('JWT has no "kid" claim.');
    });

    it('should throw if the public keys do not have a property that matches header.kid', () => {
      expect(() =>
        identity.getPublicKey(
          {
            alg: identity.JWT_ALG,
            kid: '123456',
          },
          {}
        )
      ).to.throw(
        'Provided JWT has "kid" claim which does not correspond to a known public key. Most likely the JWT is expired.'
      );
    });

    it('should return the correct public key', () => {
      expect(
        identity.getPublicKey(
          {
            alg: identity.JWT_ALG,
            kid: '123456',
          },
          {
            '123456': '7890',
            '2468': '1357',
          }
        )
      ).to.eq('7890');
    });
  });

  describe('isAuthorizedCloudFunctionURL', () => {
    it('should return false on a bad gcf direction', () => {
      expect(
        identity.isAuthorizedCloudFunctionURL(
          `https://us-central1-europe-${PROJECT}.cloudfunctions.net/function-1`,
          PROJECT
        )
      ).to.be.false;
    });

    it('should return false on a bad project', () => {
      expect(
        identity.isAuthorizedCloudFunctionURL(
          `https://us-central1-${PROJECT}-old.cloudfunctions.net/function-1`,
          PROJECT
        )
      ).to.be.false;
    });

    it('should return true on a good url', () => {
      expect(identity.isAuthorizedCloudFunctionURL(VALID_URL, PROJECT)).to.be
        .true;
    });
  });

  describe('checkDecodedToken', () => {
    it('should throw on unauthorized function url', () => {
      expect(() =>
        identity.checkDecodedToken(
          {
            aud: `fake-region-${PROJECT}.cloudfunctions.net/fn1`,
          } as identity.DecodedJwt,
          PROJECT
        )
      ).to.throw('Provided JWT has incorrect "aud" (audience) claim.');
    });

    it('should throw on a bad iss property', () => {
      expect(() =>
        identity.checkDecodedToken(
          {
            aud: VALID_URL,
            iss: `https://someissuer.com/a-project`,
          } as identity.DecodedJwt,
          PROJECT
        )
      ).to.throw(
        `Provided JWT has incorrect "iss" (issuer) claim. Expected "${identity.JWT_ISSUER}${PROJECT}" but got "https://someissuer.com/a-project".`
      );
    });

    it('should throw if sub is not a string', () => {
      expect(() =>
        identity.checkDecodedToken(
          ({
            aud: VALID_URL,
            iss: `${identity.JWT_ISSUER}${PROJECT}`,
            sub: {
              key: 'val',
            },
          } as unknown) as identity.DecodedJwt,
          PROJECT
        )
      ).to.throw('Provided JWT has no "sub" (subject) claim.');
    });

    it('should throw if sub is empty', () => {
      expect(() =>
        identity.checkDecodedToken(
          {
            aud: VALID_URL,
            iss: `${identity.JWT_ISSUER}${PROJECT}`,
            sub: '',
          } as identity.DecodedJwt,
          PROJECT
        )
      ).to.throw('Provided JWT has no "sub" (subject) claim.');
    });

    it('should throw if sub length is larger than 128 chars', () => {
      const str = [];
      for (let i = 0; i < 129; i++) {
        str.push(i);
      }
      expect(() =>
        identity.checkDecodedToken(
          {
            aud: VALID_URL,
            iss: `${identity.JWT_ISSUER}${PROJECT}`,
            sub: str.toString(),
          } as identity.DecodedJwt,
          PROJECT
        )
      ).to.throw(
        'Provided JWT has "sub" (subject) claim longer than 128 characters.'
      );
    });

    it('should not throw an error on correct decoded token', () => {
      expect(() =>
        identity.checkDecodedToken(
          {
            aud: VALID_URL,
            iss: `${identity.JWT_ISSUER}${PROJECT}`,
            sub: '123456',
          } as identity.DecodedJwt,
          PROJECT
        )
      ).to.not.throw();
    });
  });

  describe('parseUserRecord', () => {
    it('should parse user record', () => {
      expect(() =>
        identity.parseUserRecord(DECODED_USER_RECORD)
      ).to.not.throw();
    });
  });
});
