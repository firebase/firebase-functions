import { storage } from '../../src/providers/storage';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';
import { Event } from '../../src/event';

describe('storage.FunctionBuilder', () => {
  let subject: storage.FunctionBuilder;
  let handler: (e: Event<storage.Object>) => PromiseLike<any> | any;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new storage.FunctionBuilder(env, 'bucky');
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
      let subjectQualified = new storage.FunctionBuilder(env, 'projects/_/buckets/bucky');
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
        let badSubject = new storage.FunctionBuilder(env, 'bad/bucket/format');
        return badSubject.onChange(handler);
      };
      expect(func).to.throw(Error);
    });

    it ('should throw with when using bucket not in _ project', () => {
      let func = () => {
        let badSubject = new storage.FunctionBuilder(env, 'projects/anotherProject/buckets/bucky');
        return badSubject.onChange(handler);
      };
      expect(func).to.throw(Error);
    });
  });
});
