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

  describe('#on', () => {
    it('should throw on an event type other than "message"', () => {
      expect(() => {
        subject.on('foo', handler)
      }).to.throw('Provider cloud.pubsub does not support event type "foo"');
    });

    it('should return a CloudPubsubTriggerDefinition with appropriate values', () => {
      expect(subject.on('message', handler));
      expect(handler.__trigger).to.deep.equal({
        service: 'cloud.pubsub',
        event: 'message',
        topic: 'toppy'
      });
    });
  });
});