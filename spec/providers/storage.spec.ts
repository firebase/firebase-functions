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

import * as storage from '../../src/providers/storage';
import { expect as expect } from 'chai';
import { fakeConfig } from '../support/helpers';
import { config } from '../../src/index';

describe('storage.FunctionBuilder', () => {
  before(() => {
    config.singleton = fakeConfig();
  });

  after(() => {
    delete config.singleton;
  });

  describe('#onChange', () => {
    it('should return a TriggerDefinition with appropriate values', () => {
      let cloudFunction = storage.bucket('bucky').object().onChange(() => null);
      expect(cloudFunction.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.storage/eventTypes/object.change',
          resource: 'projects/_/buckets/bucky',
        },
      });
    });

    it('should use the default bucket when none is provided', () => {
      let cloudFunction = storage.object().onChange(() => null);
      expect(cloudFunction.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.storage/eventTypes/object.change',
          resource: 'projects/_/buckets/bucket',
        },
      });
    });

    it('should allow fully qualified bucket names', () => {
      let subjectQualified = new storage.ObjectBuilder('projects/_/buckets/bucky');
      let result = subjectQualified.onChange(() => null);
      expect(result.__trigger).to.deep.equal({
        eventTrigger: {
          eventType: 'providers/cloud.storage/eventTypes/object.change',
          resource: 'projects/_/buckets/bucky',
        },
      });
    });

    it('should throw with improperly formatted buckets', () => {
      expect(() => storage.bucket('bad/bucket/format')).to.throw(Error);
    });

    it('should filter out spurious deploy-time events', () => {
      let functionRan = false;
      let cloudFunction = storage.object().onChange(() => {
        functionRan = true;
        return null;
      });

      let spuriousEvent = {
        timestamp: '2017-03-06T20:02:05.192Z',
        eventType: 'providers/cloud.storage/eventTypes/object.change',
        resource: 'projects/_/buckets/rjh-20170306.appspot.com/objects/#0',
        data: {
          kind: 'storage#object',
          resourceState: 'exists',
          id: 'rjh-20170306.appspot.com//0',
          selfLink: 'https://www.googleapis.com/storage/v1/b/rjh-20170306.appspot.com/o/',
          bucket: 'rjh-20170306.appspot.com',
          generation: '0',
          metageneration: '0',
          contentType: '',
          timeCreated: '1970-01-01T00:00:00.000Z',
          updated: '1970-01-01T00:00:00.000Z',
          size: '0',
          md5Hash: '',
          mediaLink: 'https://www.googleapis.com/storage/v1/b/rjh-20170306.appspot.com/o/?generation=0&alt=media',
          crc32c: 'AAAAAA==',
        },
        params: {},
      };
      return cloudFunction(spuriousEvent).then((result) => {
        expect(result).equals(null);
        expect(functionRan).equals(false);
      });
    });
  });
});
