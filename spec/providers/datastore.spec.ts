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

import * as datastore from '../../src/providers/datastore';
import { expect } from 'chai';

describe('Datastore Functions', () => {

  before(() => {
    process.env.GCLOUD_PROJECT = 'project1';
  });

  after(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  describe('DataConstructors', () => {
    function expectedTrigger(resource: string) {
      return {
        eventTrigger: {
          resource,
          eventType: `providers/${datastore.provider}/eventTypes/document.write`,
        },
      };
    }

    it('should allow terse constructors', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let cloudFunction = datastore.document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource));
    });

    it('should allow custom namespaces', () => {
      let resource = 'projects/project1/databases/(default)/documents@v2/users/{uid}';
      let cloudFunction = datastore.namespace('v2').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource));
    });

    it('should allow custom databases', () => {
      let resource = 'projects/project1/databases/myDB/documents/users/{uid}';
      let cloudFunction = datastore.database('myDB').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource));
    });

    it('should allow both custom database and namespace', () => {
      let resource = 'projects/project1/databases/myDB/documents@v2/users/{uid}';
      let cloudFunction = datastore.database('myDB').namespace('v2').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource));
    });
  });
});
