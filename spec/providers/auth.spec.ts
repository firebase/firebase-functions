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
    let cloudFunctionCreate;
    let cloudFunctionDelete;
    let event;

    before(() => {
      cloudFunctionCreate = auth.user().onCreate((ev: Event<firebase.auth.UserRecord>) => ev.data);
      cloudFunctionDelete = auth.user().onDelete((ev: Event<firebase.auth.UserRecord>) => ev.data);
      event = {
        data: {
          metadata: {
            createdAt: '2016-12-15T19:37:37.059Z',
            lastSignedInAt: '2017-01-01T00:00:00.000Z',
          },
        },
      };
    });

    it('should transform old wire format for UserRecord into v5.0.0 format', () => {
      return Promise.all([
        cloudFunctionCreate(event).then(data => {
          expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
          expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
        }),
        cloudFunctionDelete(event).then(data => {
          expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
          expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
        }),
      ]);
    });

    // createdAt and lastSignedIn are fields of admin.auth.UserMetadata below v5.0.0
    // We want to add shims to still expose these fields so that user's code do not break
    // The shim and this test should be removed in v1.0.0 of firebase-functions
    it('should still retain createdAt and lastSignedIn', () => {
      return Promise.all([
        cloudFunctionCreate(event).then(data => {
          expect(data.metadata.createdAt).to.deep.equal(new Date('2016-12-15T19:37:37.059Z'));
          expect(data.metadata.lastSignedInAt).to.deep.equal(new Date('2017-01-01T00:00:00.000Z'));
        }),
        cloudFunctionDelete(event).then(data => {
          expect(data.metadata.createdAt).to.deep.equal(new Date('2016-12-15T19:37:37.059Z'));
          expect(data.metadata.lastSignedInAt).to.deep.equal(new Date('2017-01-01T00:00:00.000Z'));
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
        cloudFunctionCreate(newEvent).then(data => {
          expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
          expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
          expect(data.metadata.createdAt).to.deep.equal(new Date('2016-12-15T19:37:37.059Z'));
          expect(data.metadata.lastSignedInAt).to.deep.equal(new Date('2017-01-01T00:00:00.000Z'));
        }),
        cloudFunctionDelete(newEvent).then(data => {
          expect(data.metadata.creationTime).to.equal('2016-12-15T19:37:37.059Z');
          expect(data.metadata.lastSignInTime).to.equal('2017-01-01T00:00:00.000Z');
          expect(data.metadata.createdAt).to.deep.equal(new Date('2016-12-15T19:37:37.059Z'));
          expect(data.metadata.lastSignedInAt).to.deep.equal(new Date('2017-01-01T00:00:00.000Z'));
        }),
      ]);
    });
  });
});
