import { storage } from '../../src/providers/storage';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { Event } from '../../src/event';

describe('storage.FunctionBuilder', () => {
  let subject: storage.FunctionBuilder;
  let handler: (e: Event<storage.Object>) => PromiseLike<any> | any;
  let env = new FakeEnv();

  before(() => {
    env.makeReady();
    env.stubSingleton();
  });

  after(() => {
    env.restoreSingleton();
  });

  beforeEach(() => {
    env = new FakeEnv();
    subject = new storage.FunctionBuilder('bucky');
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
      let subjectQualified = new storage.FunctionBuilder('projects/_/buckets/bucky');
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
        let badSubject = new storage.FunctionBuilder('bad/bucket/format');
        return badSubject.onChange(handler);
      };
      expect(func).to.throw(Error);
    });

    it ('should throw with when using bucket not in _ project', () => {
      let func = () => {
        let badSubject = new storage.FunctionBuilder('projects/anotherProject/buckets/bucky');
        return badSubject.onChange(handler);
      };
      expect(func).to.throw(Error);
    });
  });
});
