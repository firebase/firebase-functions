import * as sinon from 'sinon';
import { expect } from 'chai';
import { FakeEnv, async } from './support/helpers';
import { FunctionBuilder } from '../src/builder';
import { Event } from '../src/event';

describe('FunctionBuilder', () => {
  let subject;
  let env;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new FunctionBuilder(env);
  });

  describe('_makeHandler(handler: Function, event: string)', () => {
    it('should put a __trigger on the returned handler', () => {
      sinon.mock(subject)
        .expects('_toTrigger')
        .withArgs('evee')
        .returns({worked: true});

      let fn = function() { /* do nothing */ };
      expect(subject['_makeHandler'](fn, 'evee').__trigger)
        .to.deep.equal({worked: true});
    });

    it('should not run handler before env ready', () => {
      sinon.stub(subject, '_toTrigger').returns({});
      let called = false;
      let handler = subject['_makeHandler'](() => {
        called = true;
      });
      handler();
      return async().then(() => {
        expect(called).to.be.false;
      });
    });

    it('should run handler after env ready', () => {
      sinon.stub(subject, '_toTrigger').returns({});
      let called = false;
      let handler = subject['_makeHandler'](() => {
        called = true;
      });
      handler();
      env.makeReady();
      return async().then(() => {
        expect(called).to.be.true;
      });
    });
  });

  describe('__isEventNewFormat(event: GenericEvent): boolean', () => {
    it('should return true when event is in new format', () => {
      const event = new Event({
        action: 'sources/firebase.database/actions/write',
        resource: 'projects/project1',
        path: '/path',
      }, undefined);
      expect(subject._isEventNewFormat(event)).to.equal(true);
    });

    it('should return false when event is not in new format', () => {
      const event = {
        service: 'database',
      };
      expect(subject._isEventNewFormat(event)).to.equal(false);
    });
  });
});
