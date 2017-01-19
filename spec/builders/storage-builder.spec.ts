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
    it('should return a TriggerDefinition with appropriate values', () => {
      let result = subject.onChange(handler);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.storage/eventTypes/object.change',
          resource: 'projects/_/buckets/bucky',
        },
      });
    });

    it ('should allow fully qualified bucket names', () => {
      let subjectQualified = new CloudStorageBuilder(env, 'projects/_/buckets/bucky');
      let result = subjectQualified.onChange(handler);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.storage/eventTypes/object.change',
          resource: 'projects/_/buckets/bucky',
        },
      });
    });

    it ('should throw with improperly formatted buckets', () => {
      let func = () => {
        let badSubject = new CloudStorageBuilder(env, 'bad/bucket/format');
        return badSubject.onChange(handler);
      };
      expect(func).to.throw(Error);
    });

    it ('should throw with when using bucket not in _ project', () => {
      let func = () => {
        let badSubject = new CloudStorageBuilder(env, 'projects/anotherProject/buckets/bucky');
        return badSubject.onChange(handler);
      };
      expect(func).to.throw(Error);
    });
  });
});
