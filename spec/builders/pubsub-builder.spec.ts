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

describe('CloudPubsubBuilder', () => {
  let subject: CloudPubsubBuilder;
  let env: FakeEnv;
  let handler: (any) => any;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new CloudPubsubBuilder(env, 'toppy');
    handler = (data: Object) => {
      return true;
    };
    process.env.GCLOUD_PROJECT = 'project1';
  });

  afterEach(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  describe('#onPublish', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      let result = subject.onPublish(handler);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
          resource: 'projects/project1/topics/toppy',
        },
      });
    });

    it ('should allow fully qualified topic names', () => {
      let subjectQualified = new CloudPubsubBuilder(env, 'projects/project1/topics/toppy');
      let result = subjectQualified.onPublish(handler);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.pubsub/eventTypes/topic.publish',
          resource: 'projects/project1/topics/toppy',
        },
      });
    });

    it ('should throw with improperly formatted topics', () => {
      let func = () => {
        let badSubject = new CloudPubsubBuilder(env, 'bad/topic/format');
        return badSubject.onPublish(handler);
      };
      expect(func).to.throw(Error);
    });

    it ('should throw with when using topic in another project', () => {
      let func = () => {
        let badSubject = new CloudPubsubBuilder(env, 'projects/anotherProject/topics/toppy');
        return badSubject.onPublish(handler);
      };
      expect(func).to.throw(Error);
    });

    it('should properly handle a new-style event', () => {
      let handler2 = (ev: Event<PubsubMessage>) => {
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
      let result = subject.onPublish(handler2);
      env.makeReady();
      return expect(result(event)).to.eventually.deep.equal({
        raw,
        json: {hello: 'world'},
        attributes: {foo: 'bar'},
      });
    });
  });
});
