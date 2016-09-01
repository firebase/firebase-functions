/// <reference path="../../typings/index.d.ts" />

import {default as CloudHttpBuilder, CloudHttpHandler} from '../../src/cloud/http-builder';
import {expect as expect} from 'chai';

describe('CloudHttpBuilder', () => {
  let subject: CloudHttpBuilder;
  let handler: CloudHttpHandler;

  beforeEach(() => {
    subject = new CloudHttpBuilder();
    handler = (req: any, res: any) => {
      res.send(200);
    }
  });

  describe('#onRequest', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      expect(subject.onRequest(handler));
      expect(handler.__trigger).to.deep.equal({
        service: 'cloud.http',
        event: 'request'
      });
    });
  });
});
