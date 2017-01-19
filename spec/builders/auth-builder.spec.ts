import AuthBuilder from '../../src/builders/auth-builder';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { AuthEventData } from '../../src/builders/auth-builder';
import { Event } from '../../src/event';
import * as Promise from 'bluebird';

describe('AuthBuilder', () => {
  let subject: AuthBuilder;
  let handler: (e: Event<AuthEventData>) => PromiseLike<any> | any;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new AuthBuilder(env);
    handler = () => {
      return true;
    };
    process.env.GCLOUD_PROJECT = 'project1';
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  describe('#onCreate', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      let result = subject.onCreate(handler);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
            eventType: 'providers/firebase.auth/eventTypes/user.create',
            resource: 'projects/project1',
        },
      });
    });
  });

  describe('#onDelete', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      let result = subject.onDelete(handler);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
            eventType: 'providers/firebase.auth/eventTypes/user.delete',
            resource: 'projects/project1',
        },
      });
    });
  });

  describe('#_dataConstructor', () => {
    it('should handle an event with the appropriate fields', () => {
      let func = subject.onCreate((ev: Event<AuthEventData>) => {
        return Promise.resolve(ev.data);
      });
      env.makeReady();

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

      return expect(func(event)).to.eventually.deep.equal(event.data);
    });

    // This isn't expected to happen in production, but if it does we should
    // handle it gracefully.
    it('should tolerate missing fields in the payload', () => {
      let func = subject.onCreate((ev: Event<AuthEventData>) => {
        return Promise.resolve(ev.data);
      });
      env.makeReady();

      let event = {
        data:  {
          uid: 'abcde12345',
          metadata:  {
            createdAt: '2016-12-15T19:37:37.059Z',
          },
        },
      };

      return expect(func(<Event<AuthEventData>>event)).to.eventually.deep.equal(event.data);
    });
  });
});
