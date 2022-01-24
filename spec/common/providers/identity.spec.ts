import { expect } from 'chai';
import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as sinon from 'sinon';

import * as identity from '../../../src/common/providers/identity';


describe('identity', () => {
  describe('fetchPublicKeys', async () => {

  });

  describe('validRequest', () => {
    it('should error on non-post', () => {
      const req: express.Request = {

      };
      expect(identity.validRequest(req)).to.throw()
    });
  })
});