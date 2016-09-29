import { PubsubMessage, default as CloudPubsubBuilder } from '../../src/cloud/pubsub-builder';
import { expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { Event } from '../../src/event';

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

    it('should preserve message when handling a legacy event', (done) => {
      let handler = (payload: Event<PubsubMessage>) => {
        return payload.data.data;
      };
      let legacyEvent = {message: 'hi'};
      let result = subject.onPublish(handler);
      env.makeReady();
      expect(result(legacyEvent)).to.eventually.deep.equal({'message': 'hi'}).notify(done);
    });
  });
});
