import { default as CloudHttpsBuilder, CloudHttpsHandler } from '../../src/cloud/https-builder';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';

describe('CloudHttpsBuilder', () => {
  let subject: CloudHttpsBuilder;
  let handler: CloudHttpsHandler;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new CloudHttpsBuilder(env);
    handler = (req: any, res: any) => {
      res.send(200);
    };
  });

  describe('#onRequest', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      let result = subject.onRequest(handler);
      expect(result.__trigger).to.deep.equal({
        service: 'cloud.http',
        event: 'request',
      });
    });
  });
});
