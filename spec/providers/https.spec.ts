import * as https from '../../src/providers/https';
import { expect as expect } from 'chai';
import { FakeEnv } from '../support/helpers';

describe('CloudHttpsBuilder', () => {
  let env = new FakeEnv();

  before(() => {
    env.makeReady();
    env.stubSingleton();
  });

  after(() => {
    env.restoreSingleton();
  });

  describe('#onRequest', () => {
    it('should return a Trigger with appropriate values', () => {
      let result = https.onRequest((req, resp) => {
        resp.send(200);
      });
      expect(result.__trigger).to.deep.equal({httpsTrigger: {}});
    });
  });
});
