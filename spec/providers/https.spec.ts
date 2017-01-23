import { https } from '../../src/providers/https';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';

describe('CloudHttpsBuilder', () => {
  let subject: https.FunctionBuilder;
  let env = new FakeEnv();

  before(() => {
    env.makeReady();
    env.stubSingleton();
  });

  after(() => {
    env.restoreSingleton();
  });

  beforeEach(() => {
    subject = new https.FunctionBuilder();
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
