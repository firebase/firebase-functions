import * as express from 'express';
// import * as firebase from 'firebase-admin';
// import * as sinon from 'sinon';

import * as identity from '../../../src/common/providers/identity';
import { expect } from 'chai';
// import { MockRequest } from '../../fixtures/mockrequest';

describe('identity', () => {
  const project = 'project1';

  before(() => {
    process.env.GCLOUD_PROJECT = project;
  });

  after(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  describe('fetchPublicKeys', async () => {});

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
});
