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

import * as auth from '../../src/providers/auth';
import { expect } from 'chai';
import * as firebase from 'firebase-admin';
import { CloudFunction } from '../../src';

describe('Auth Functions', () => {
  describe('AuthBuilder', () => {
    let handler: (user: firebase.auth.UserRecord) => PromiseLike<any> | any;

    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    describe('#onCreate', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        const cloudFunction = auth.user().onCreate(() => null);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'providers/firebase.auth/eventTypes/user.create',
            resource: 'projects/project1',
            service: 'firebaseauth.googleapis.com',
          },
        });
      });
    });

    describe('#onDelete', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        const cloudFunction = auth.user().onDelete(handler);
        expect(cloudFunction.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'providers/firebase.auth/eventTypes/user.delete',
            resource: 'projects/project1',
            service: 'firebaseauth.googleapis.com',
          },
        });
      });
    });

    describe('#_dataConstructor', () => {
      let cloudFunctionCreate: CloudFunction<firebase.auth.UserRecord>;
      let cloudFunctionDelete: CloudFunction<firebase.auth.UserRecord>;
      let event: any;

      before(() => {
        cloudFunctionCreate = auth.user().onCreate((data: firebase.auth.UserRecord) => data);
        cloudFunctionDelete = auth.user().onDelete((data: firebase.auth.UserRecord) => data);
        event = {
          data: {
            metadata: {
              createdAt: '2016-12-15T19:37:37.059Z',
              lastSignedInAt: '2017-01-01T00:00:00.000Z',
            },
          },
        };
      });

      it('should transform wire format for UserRecord into v5.0.0 format', () => {
        return Promise.all([
          cloudFunctionCreate(event).then((data: any) => {
            expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
            expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
          }),
          cloudFunctionDelete(event).then((data: any) => {
            expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
            expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
          }),
        ]);
      });

      it('should handle new wire format if/when there is a change', () => {
        const newEvent = {
          data: {
            metadata: {
              creationTime: '2016-12-15T19:37:37.059Z',
              lastSignInTime: '2017-01-01T00:00:00.000Z',
            },
          },
        };

        return Promise.all([
          cloudFunctionCreate(newEvent).then((data: any) => {
            expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
            expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
          }),
          cloudFunctionDelete(newEvent).then((data: any) => {
            expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
            expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
          }),
        ]);
      });
    });
  });

  describe('userRecordConstructor', () => {
    it('will provide falsey values for fields that are not in raw wire data', () => {
      const record = auth.userRecordConstructor({ uid: '123'});
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
      const record = auth.userRecordConstructor(raw);
      expect(record.toJSON()).to.deep.equal(raw);
    });
  });

  describe('process.env.GCLOUD_PROJECT not set', () => {
    it('should not throw if __trigger is not accessed', () => {
      expect(() => auth.user().onCreate(() => null)).to.not.throw(Error);
    });

    it('should throw when trigger is accessed', () => {
      expect(() => auth.user().onCreate(() => null).__trigger).to.throw(Error);
    });

    it('should not throw when #run is called', () => {
      let cf = auth.user().onCreate(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });
});
