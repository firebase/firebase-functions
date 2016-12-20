import CloudStorageBuilder from '../../src/builders/storage-builder';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { StorageObject } from '../../src/builders/storage-builder';
import { Event } from '../../src/event';

describe('CloudHttpBuilder', () => {
  let subject: CloudStorageBuilder;
  let handler: (e: Event<StorageObject>) => PromiseLike<any> | any;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new CloudStorageBuilder(env, 'bucky');
    handler = (data) => {
      return true;
    };
  });

  describe('#onChange', () => {
    it('should return a CloudStorageTriggerDefinition with appropriate values', () => {
      let result = subject.onChange(handler);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.storage/eventTypes/object.change',
          resource: 'projects/undefined/buckets/bucky',
        },
      });
    });
  });
});
