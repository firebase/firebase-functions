import CloudStorageBuilder from '../../src/cloud/storage-builder';
import {expect as expect} from 'chai';
import { FakeEnv } from '../support/helpers';
import { FunctionHandler } from './../../src/builder';

describe('CloudHttpBuilder', () => {
  let subject: CloudStorageBuilder;
  let handler: FunctionHandler;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new CloudStorageBuilder(env, 'bucky');
    handler = (data: Object) => {
      return true;
    };
  });

  describe('#onChange', () => {
    it('should return a CloudStorageTriggerDefinition with appropriate values', () => {
      let result = subject.onChange(handler);
      expect(result.__trigger).to.deep.equal({
        service: 'cloud.storage',
        event: 'change',
        bucket: 'bucky',
      });
    });
  });
});
