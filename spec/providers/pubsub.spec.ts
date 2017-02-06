import * as pubsub from '../../src/providers/pubsub';
import { expect } from 'chai';
import { FakeEnv } from '../support/helpers';

describe('pubsub.Message', () => {
  describe('#json', () => {
    it('should return json decoded from base64', () => {
      let message = new pubsub.Message({
        data: new Buffer('{"hello":"world"}', 'utf8').toString('base64'),
      });

      expect(message.json.hello).to.equal('world');
    });

    it('should preserve passed in json', () => {
      let message = new pubsub.Message({
        data: new Buffer('{"hello":"world"}', 'utf8').toString('base64'),
        json: {goodbye: 'world'},
      });

      expect(message.json.goodbye).to.equal('world');
    });
  });

  describe('#toJSON', () => {
    it('should be JSON stringify-able', () => {
      let encoded = new Buffer('{"hello":"world"}', 'utf8').toString('base64');
      let message = new pubsub.Message({
        data: encoded,
      });

      expect(JSON.parse(JSON.stringify(message))).to.deep.equal({
        data: encoded,
        attributes: {},
      });
    });
  });
});

describe('pubsub.FunctionBuilder', () => {
  let env = new FakeEnv();

  before(() => {
    env.makeReady();
    env.stubSingleton();
    process.env.GCLOUD_PROJECT = 'project1';
  });

  after(() => {
    env.restoreSingleton();
    delete process.env.GCLOUD_PROJECT;
  });

  describe('#onPublish', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      // Pick up project from process.env.GCLOUD_PROJECT
      const result = pubsub.topic('toppy').onPublish(() => null);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
          resource: 'projects/project1/topics/toppy',
        },
      });
    });

    it ('should throw with improperly formatted topics', () => {
      expect(() => pubsub.topic('bad/topic/format')).to.throw(Error);
    });

    it('should properly handle a new-style event', () => {
      const raw = new Buffer('{"hello":"world"}', 'utf8').toString('base64');
      const event = {
        data: {
          data: raw,
          attributes: {
            foo: 'bar',
          },
        },
      };

      const result = pubsub.topic('toppy').onPublish(ev => {
        return {
          raw: ev.data.data,
          json: ev.data.json,
          attributes: ev.data.attributes,
        };
      });

      return expect(result(event)).to.eventually.deep.equal({
        raw,
        json: {hello: 'world'},
        attributes: {foo: 'bar'},
      });
    });
  });
});
