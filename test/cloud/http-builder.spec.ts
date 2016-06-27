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

  describe('#on', () => {
    it('should throw on an event type other than "request"', () => {
      expect(() => {
        subject.on('foo', handler)
      }).to.throw('Provider cloud.http does not support event type "foo"');
    });

    it('should return a TriggerDefinition with appropriate values', () => {
      expect(subject.on('request', handler));
      expect(handler.__trigger).to.deep.equal({
        service: 'cloud.http',
        event: 'request'
      });
    });
  });
});