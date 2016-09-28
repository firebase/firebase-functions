import CloudPubsubBuilder from '../../src/cloud/pubsub-builder';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { FunctionHandler } from './../../src/builder';

describe('CloudHttpBuilder', () => {
  let subject: CloudPubsubBuilder;
  let handler: FunctionHandler;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new CloudPubsubBuilder(env, 'toppy');
    handler = (data: Object) => {
      return true;
    };
  });

  describe('#onMessage', () => {
    it('should return a CloudPubsubTriggerDefinition with appropriate values', () => {
      let result = subject.onMessage(handler);
      expect(result.__trigger).to.deep.equal({
        service: 'cloud.pubsub',
        event: 'message',
        topic: 'toppy',
      });
    });
  });
});
