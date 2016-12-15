import { PubsubMessage, default as CloudPubsubBuilder } from '../../src/builders/pubsub-builder';
import { expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { Event } from '../../src/event';

describe('PubsubMessage', () => {
  describe('#json', () => {
    it('should return json decoded from base64', () => {
      let message = new PubsubMessage({
        data: new Buffer('{"hello":"world"}', 'utf8').toString('base64'),
      });

      expect(message.json.hello).to.equal('world');
    });

    it('should preserve passed in json', () => {
      let message = new PubsubMessage({
        data: new Buffer('{"hello":"world"}', 'utf8').toString('base64'),
        json: {goodbye: 'world'},
      });

      expect(message.json.goodbye).to.equal('world');
    });
  });

  describe('#toJSON', () => {
    it('should be JSON stringify-able', () => {
      let encoded = new Buffer('{"hello":"world"}', 'utf8').toString('base64');
      let message = new PubsubMessage({
        data: encoded,
      });

      expect(JSON.parse(JSON.stringify(message))).to.deep.equal({
        data: encoded,
        attributes: {},
      });
    });
  });
});

describe('CloudHttpBuilder', () => {
  let subject: CloudPubsubBuilder;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new CloudPubsubBuilder(env, 'toppy');
  });

  describe('#onPublish', () => {
    it('should return a CloudPubsubTriggerDefinition with appropriate values', () => {
      let handler = (data: Object) => {
        return true;
      };
      let result = subject.onPublish(handler);
      expect(result.__trigger).to.deep.equal({
        service: 'cloud.pubsub',
        event: 'message',
        topic: 'toppy',
      });
    });

    it('should properly handle a new-style event', () => {
      let handler = (ev: Event<PubsubMessage>) => {
        return {
          raw: ev.data.data,
          json: ev.data.json,
          attributes: ev.data.attributes,
        };
      };
      let raw = new Buffer('{"hello":"world"}', 'utf8').toString('base64');
      let event = {
        data: {
          data: raw,
          attributes: {
            foo: 'bar',
          },
        },
      };
      let result = subject.onPublish(handler);
      env.makeReady();
      return expect(result(event)).to.eventually.deep.equal({
        raw,
        json: {hello: 'world'},
        attributes: {foo: 'bar'},
      });
    });
  });
});
