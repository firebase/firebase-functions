/// <reference path="../../typings/index.d.ts" />

import {default as CloudStorageBuilder, CloudStorageHandler} from '../../src/cloud/storage-builder';
import {expect as expect} from 'chai';

describe('CloudHttpBuilder', () => {
  let subject: CloudStorageBuilder;
  let handler: CloudStorageHandler;

  beforeEach(() => {
    subject = new CloudStorageBuilder('bucky');
    handler = (data: Object) => {
      return true;
    }
  });

  describe('#on', () => {
    it('should throw on an event type other than "change"', () => {
      expect(() => {
        subject.on('foo', handler)
      }).to.throw('Provider cloud.storage does not support event type "foo"');
    });

    it('should return a CloudStorageTriggerDefinition with appropriate values', () => {
      expect(subject.on('change', handler));
      expect(handler.__trigger).to.deep.equal({
        service: 'cloud.storage',
        event: 'change',
        bucket: 'bucky'
      });
    });
  });
});