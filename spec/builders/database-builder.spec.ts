import DatabaseBuilder from '../../src/builders/database-builder';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import Apps from '../../src/apps';
import * as _ from 'lodash';

describe('DatabaseBuilder', () => {
  let subject: DatabaseBuilder;
  let env: FakeEnv;
  let apps: Apps;

  beforeEach(() => {
    env = new FakeEnv();
    apps = new Apps(env);
    subject = new DatabaseBuilder(env, apps);
  });

  describe('#path()', () => {
    it('should append paths if called multiple times', () => {
      subject.path('first/bit');
      subject.path('{id}/second/bit');
      return expect(subject['_toTrigger']('data.write').eventTrigger.path).to.equal('/first/bit/{id}/second/bit');
    });
  });

  describe('#_toTrigger()', () => {
    it('should return "write" as the default event type', () => {
      let eventType = subject['_toTrigger']('data.write').eventTrigger.eventType;
      expect(eventType).to.eq('providers/firebase.database/eventTypes/data.write');
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
      return handler(<any>{data: {
        data: null,
        delta: {foo: 'bar'},
      }});
    });
  });
});
