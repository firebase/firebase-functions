import { default as CloudHttpsBuilder } from '../../src/builders/https-builder';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';

describe('CloudHttpsBuilder', () => {
  let subject: CloudHttpsBuilder;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new CloudHttpsBuilder(env);
  });

  describe('#onRequest', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      let result = subject.onRequest((req, resp) => {
        resp.send(200);
      });
      expect(result.__trigger).to.deep.equal({
        service: 'cloud.http',
        event: 'request',
      });
    });
  });
});
