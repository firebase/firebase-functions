import * as auth from '../../src/providers/auth';
import { expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { Event } from '../../src/event';
import * as firebase from 'firebase-admin';

describe('AuthBuilder', () => {
  let handler: (e: Event<firebase.auth.UserRecord>) => PromiseLike<any> | any;
  let env = new FakeEnv();

  before(() => {
    env.stubSingleton();
    env.makeReady();
    process.env.GCLOUD_PROJECT = 'project1';
  });

  after(() => {
    env.restoreSingleton();
    delete process.env.GCLOUD_PROJECT;
  });

  describe('#onCreate', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      const cloudFunction = auth.user().onCreate(() => null);
      expect(cloudFunction.__trigger).to.deep.equal({
        eventTrigger: {
            eventType: 'providers/google.firebase.auth/eventTypes/user.create',
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
            eventType: 'providers/google.firebase.auth/eventTypes/user.delete',
            resource: 'projects/project1',
        },
      });
    });
  });

  describe('#_dataConstructor', () => {
    it('should handle an event with the appropriate fields', () => {
      const cloudFunction = auth.user().onCreate((ev: Event<firebase.auth.UserRecord>) => ev.data);

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

      return expect(cloudFunction(event)).to.eventually.deep.equal(event.data);
    });

    // This isn't expected to happen in production, but if it does we should
    // handle it gracefully.
    it('should tolerate missing fields in the payload', () => {
      const cloudFunction = auth.user().onCreate((ev: Event<firebase.auth.UserRecord>) => ev.data);

      let event: Event<firebase.auth.UserRecord> = {
        data:  {
          uid: 'abcde12345',
          metadata:  {
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
