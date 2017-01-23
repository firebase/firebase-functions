import * as sinon from 'sinon';
import * as Promise from 'bluebird';
import { expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { AbstractFunctionBuilder } from '../../src/providers/base';
import { RawEvent } from '../../src/event';

describe('AbstractFunctionBuilder', () => {
  let subject;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    env.stubSingleton();
    subject = new AbstractFunctionBuilder();
  });

  afterEach(() => {
    env.restoreSingleton();
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
      return Promise.resolve().then(() => {
        expect(called).to.be.false;
      });
    });

    it('should run handler after env ready', () => {
      sinon.stub(subject, '_toTrigger').returns({});
      let called = false;
      let handler = subject['_makeHandler']((payload) => {
        called = true;
      });
      handler({});
      env.makeReady();
      return Promise.resolve().then(() => {
        expect(called).to.be.true;
      });
    });

    it('should preserve payload metadata', () => {
      sinon.stub(subject, '_toTrigger').returns({});
      let event: RawEvent = {
        eventId: '00000',
        timestamp: '2016-11-04T21:29:03.496Z',
        auth: {
          admin: true,
        },
        eventType: 'providers/provider/eventTypes/event',
        resource: 'resource',
        path: 'path',
        params: {
          foo: 'bar',
        },
        data: 'data',
      };
      let handler = subject['_makeHandler']((e) => {
        return e;
      });
      env.makeReady();
      return expect(handler(event)).to.eventually.deep.equal({
        eventId: '00000',
        timestamp: '2016-11-04T21:29:03.496Z',
        auth: {
          admin: true,
        },
        eventType: 'providers/provider/eventTypes/event',
        resource: 'resource',
        path: 'path',
        params: {
          foo: 'bar',
        },
        data: 'data',
      });
    });
  });
});
