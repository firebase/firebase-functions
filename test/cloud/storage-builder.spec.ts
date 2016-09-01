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

  describe('#onChange', () => {
    it('should return a CloudStorageTriggerDefinition with appropriate values', () => {
      expect(subject.onChange(handler));
      expect(handler.__trigger).to.deep.equal({
        service: 'cloud.storage',
        event: 'change',
        bucket: 'bucky'
      });
    });
  });
});
