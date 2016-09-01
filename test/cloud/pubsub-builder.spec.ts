/// <reference path="../../typings/index.d.ts" />

import {default as CloudPubsubBuilder, CloudPubsubHandler} from '../../src/cloud/pubsub-builder';
import {expect as expect} from 'chai';

describe('CloudHttpBuilder', () => {
  let subject: CloudPubsubBuilder;
  let handler: CloudPubsubHandler;

  beforeEach(() => {
    subject = new CloudPubsubBuilder('toppy');
    handler = (data: Object) => {
      return true;
    }
  });

  describe('#onMessage', () => {
    it('should return a CloudPubsubTriggerDefinition with appropriate values', () => {
      expect(subject.onMessage(handler));
      expect(handler.__trigger).to.deep.equal({
        service: 'cloud.pubsub',
        event: 'message',
        topic: 'toppy'
      });
    });
  });
});
