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
import { Event } from '../../src/cloud-functions';
import * as firebase from 'firebase-admin';

describe('AuthBuilder', () => {
  let handler: (e: Event<firebase.auth.UserRecord>) => PromiseLike<any> | any;

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
        },
      });
    });
  });

  describe('#_dataConstructor', () => {
    it('should handle an event with the appropriate fields', () => {
      const cloudFunctionCreate = auth.user().onCreate((ev: Event<firebase.auth.UserRecord>) => ev.data);
      const cloudFunctionDelete = auth.user().onDelete((ev: Event<firebase.auth.UserRecord>) => ev.data);

      // The event data delivered over the wire will be the JSON for a UserRecord:
      // https://firebase.google.com/docs/auth/admin/manage-users#retrieve_user_data
      let event = {
        eventId: 'f2e2f0bf-2e47-4d92-b009-e7a375ecbd3e',
        eventType: 'providers/firebase.auth/eventTypes/user.create',
        resource: 'projects/myUnitTestProject',
        notSupported: {
        },
        data: {
          uid: 'abcde12345',
          email: 'foo@bar.baz',
          emailVerified: false,
          displayName: 'My Display Name',
          photoURL: 'bar.baz/foo.jpg',
          disabled: false,
          metadata: {
            createdAt: '2016-12-15T19:37:37.059Z',
            lastSignedInAt: '2017-01-01T00:00:00.000Z',
          },
          providerData: [{
            uid: 'g-abcde12345',
            email: 'foo@gmail.com',
            displayName: 'My Google Provider Display Name',
            photoURL: 'googleusercontent.com/foo.jpg',
            providerId: 'google.com',
          }],
        },
      };

      const expectedData = {
        uid: 'abcde12345',
        email: 'foo@bar.baz',
        emailVerified: false,
        displayName: 'My Display Name',
        photoURL: 'bar.baz/foo.jpg',
        disabled: false,
        metadata: {
          // Gotcha's:
          // - JS Date is, by default, local-time based, not UTC-based.
          // - JS Date's month is zero-based.
          createdAt: new Date(Date.UTC(2016, 11, 15, 19, 37, 37, 59)),
          lastSignedInAt: new Date(Date.UTC(2017, 0, 1)),
        },
        providerData: [{
          uid: 'g-abcde12345',
          email: 'foo@gmail.com',
          displayName: 'My Google Provider Display Name',
          photoURL: 'googleusercontent.com/foo.jpg',
          providerId: 'google.com',
        }],
      };

      return Promise.all([
        expect(cloudFunctionCreate(event)).to.eventually.deep.equal(expectedData),
        expect(cloudFunctionDelete(event)).to.eventually.deep.equal(expectedData),
      ]);
    });

    // This isn't expected to happen in production, but if it does we should
    // handle it gracefully.
    it('should tolerate missing fields in the payload', () => {
      const cloudFunction = auth.user().onCreate((ev: Event<firebase.auth.UserRecord>) => ev.data);

      let event: Event<firebase.auth.UserRecord> = {
        data: {
          uid: 'abcde12345',
          metadata: {
            // TODO(inlined) We'll need to manually parse these!
            createdAt: new Date(),
            lastSignedInAt: new Date(),
          },
          email: 'nobody@google.com',
          emailVerified: false,
          displayName: 'sample user',
          photoURL: '',
          disabled: false,
        },
      } as any;

      return expect(cloudFunction(event)).to.eventually.deep.equal(event.data);
    });
  });
});
