// The MIT License (MIT)
//
// Copyright (c) 2017 Firebase
//
// Permission is hereby granted, free of charge, to any person obtaining a copy
// of this software and associated documentation files (the "Software"), to deal
// in the Software without restriction, including without limitation the rights
// to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
// copies of the Software, and to permit persons to whom the Software is
// furnished to do so, subject to the following conditions:
//
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
// OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
// SOFTWARE.

import { expect } from 'chai';
import * as pubsub from '../../src/providers/pubsub';
import * as functions from '../../src/index';

describe('Pubsub Functions', () => {
  describe('pubsub.Message', () => {
    describe('#json', () => {
      it('should return json decoded from base64', () => {
        let message = new pubsub.Message({
          data: new Buffer('{"hello":"world"}', 'utf8').toString('base64'),
        });

        expect(message.json.hello).to.equal('world');
      });

      it('should preserve passed in json', () => {
        let message = new pubsub.Message({
          data: new Buffer('{"hello":"world"}', 'utf8').toString('base64'),
          json: { goodbye: 'world' },
        });

        expect(message.json.goodbye).to.equal('world');
      });
    });

    describe('#toJSON', () => {
      it('should be JSON stringify-able', () => {
        let encoded = new Buffer('{"hello":"world"}', 'utf8').toString(
          'base64'
        );
        let message = new pubsub.Message({
          data: encoded,
        });

        expect(JSON.parse(JSON.stringify(message))).to.deep.equal({
          data: encoded,
          attributes: {},
        });
      });
    });
  });

  describe('pubsub.FunctionBuilder', () => {
    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('should allow both region and runtime options to be set', () => {
      let fn = functions
        .region('my-region')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .pubsub.topic('toppy')
        .onPublish(() => null);

      expect(fn.__trigger.regions).to.deep.equal(['my-region']);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal('90s');
    });

    describe('#onPublish', () => {
      it('should return a TriggerDefinition with appropriate values', () => {
        // Pick up project from process.env.GCLOUD_PROJECT
        const result = pubsub.topic('toppy').onPublish(() => null);
        expect(result.__trigger).to.deep.equal({
          eventTrigger: {
            eventType: 'google.pubsub.topic.publish',
            resource: 'projects/project1/topics/toppy',
            service: 'pubsub.googleapis.com',
          },
        });
      });

      it('should throw with improperly formatted topics', () => {
        expect(() => pubsub.topic('bad/topic/format')).to.throw(Error);
      });

      it('should properly handle a new-style event', () => {
        const raw = new Buffer('{"hello":"world"}', 'utf8').toString('base64');
        const event = {
          data: {
            data: raw,
            attributes: {
              foo: 'bar',
            },
          },
        };

        const result = pubsub.topic('toppy').onPublish(data => {
          return {
            raw: data.data,
            json: data.json,
            attributes: data.attributes,
          };
        });

        return expect(result(event)).to.eventually.deep.equal({
          raw,
          json: { hello: 'world' },
          attributes: { foo: 'bar' },
        });
      });
    });
  });

  describe('process.env.GCLOUD_PROJECT not set', () => {
    it('should not throw if __trigger is not accessed', () => {
      expect(() => pubsub.topic('toppy').onPublish(() => null)).to.not.throw(
        Error
      );
    });

    it('should throw when trigger is accessed', () => {
      expect(
        () => pubsub.topic('toppy').onPublish(() => null).__trigger
      ).to.throw(Error);
    });

    it('should not throw when #run is called', () => {
      let cf = pubsub.topic('toppy').onPublish(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });
});
