import { https } from '../../src/providers/https';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';

describe('CloudHttpsBuilder', () => {
  let subject: https.FunctionBuilder;
  let env: FakeEnv;

  beforeEach(() => {
    env = new FakeEnv();
    subject = new https.FunctionBuilder(env);
  });

  describe('#onRequest', () => {
    it('should return a Trigger with appropriate values', () => {
      let result = subject.onRequest((req, resp) => {
        resp.send(200);
      });
      expect(result.__trigger).to.deep.equal({httpsTrigger: {}});
    });
  });
});
