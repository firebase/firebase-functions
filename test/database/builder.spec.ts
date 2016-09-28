import DatabaseBuilder from '../../src/database/builder';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { UnauthenticatedCredential } from '../../src/credential';
import Apps from '../../src/apps';

describe('DatabaseBuilder', () => {
  let subject: DatabaseBuilder;
  let env: FakeEnv;
  let apps: Apps;

  beforeEach(() => {
    env = new FakeEnv();
    apps = new Apps(new UnauthenticatedCredential(), env);
    subject = new DatabaseBuilder(env, apps);
  });

  describe('#path()', () => {
    it('should append paths if called multiple times', () => {
      subject.path('first/bit');
      subject.path('{id}/second/bit');
      return expect(subject['_toTrigger']()).to.deep.equal({
        service: 'firebase.database',
        event: 'write',
        path: '/first/bit/{id}/second/bit',
      });
    });
  });

  describe('#_toTrigger()', () => {
    it('should return "write" as the default event type', () => {
      expect(subject['_toTrigger']().event).to.eq('write');
    });
  });

  describe('#onWrite()', () => {
    it('should throw if path has not been called', () => {
      expect(() => {
        subject.onWrite(evt => _.noop());
      }).to.throw('Must call .path(pathValue)');
    });

    it('should return a handler that emits events with a proper DatabaseDeltaSnapshot', () => {
      let handler = subject.path('/users/{id}').onWrite(event => {
        expect(event.data.val()).to.deep.equal({foo: 'bar'});
      });

      env.makeReady();
      return handler({data: null, delta: {foo: 'bar'}});
    });
  });
});
