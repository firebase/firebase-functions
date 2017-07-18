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

  describe('document builders and event types', () => {
    function expectedTrigger(resource: string, eventType: string) {
      return {
        eventTrigger: {
          resource,
          eventType: `providers/${datastore.provider}/eventTypes/${eventType}`,
        },
      };
    }

    it('should allow terse constructors', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let cloudFunction = datastore.document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('should allow custom namespaces', () => {
      let resource = 'projects/project1/databases/(default)/documents@v2/users/{uid}';
      let cloudFunction = datastore.namespace('v2').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('should allow custom databases', () => {
      let resource = 'projects/project1/databases/myDB/documents/users/{uid}';
      let cloudFunction = datastore.database('myDB').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('should allow both custom database and namespace', () => {
      let resource = 'projects/project1/databases/myDB/documents@v2/users/{uid}';
      let cloudFunction = datastore.database('myDB').namespace('v2').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('onCreate should have the "document.create" eventType', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let eventType = datastore.document('users/{uid}').onCreate(() => null).__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(expectedTrigger(resource, 'document.create').eventTrigger.eventType);
    });

    it('onUpdate should have the "document.update" eventType', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let eventType = datastore.document('users/{uid}').onUpdate(() => null).__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(expectedTrigger(resource, 'document.update').eventTrigger.eventType);
    });

    it('onDelete should have the "document.delete" eventType', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let eventType = datastore.document('users/{uid}').onDelete(() => null).__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(expectedTrigger(resource, 'document.delete').eventTrigger.eventType);
    });
  });

  describe('dataConstructor', () => {
    function constructData(oldValue: object, value: object) {
      return {
        'data': {
          'oldValue': oldValue,
          'value': value,
        },
      };
    }

    function createOldValue() {
      return {
        'fields': {
          'key1': {
            'booleanValue': false,
          },
          'key2': {
            'integerValue': '111',
          },
        },
      };
    }

    function createValue() {
      return {
        'fields': {
          'key1': {
            'booleanValue': true,
          },
          'key2': {
            'integerValue': '123',
          },
        },
      };
    }

    it('constructs appropriate fields and getters for event.data on "document.write" events', () => {
      let testFunction = datastore.document('path').onWrite((event) => {
        expect(event.data.data()).to.deep.equal({key1: true, key2: 123});
        expect(event.data.get('key1')).to.equal(true);
        expect(event.data.previous.data()).to.deep.equal({key1: false, key2: 111});
        expect(event.data.previous.get('key1')).to.equal(false);
      });
      let data = constructData(createOldValue(), createValue());
      return testFunction(data);
    });

    it('constructs appropriate fields and getters for event.data on "document.create" events', () => {
      let testFunction = datastore.document('path').onCreate((event) => {
        expect(event.data.data()).to.deep.equal({key1: true, key2: 123});
        expect(event.data.get('key1')).to.equal(true);
        expect(event.data.previous).to.equal(null);
      });
      let data = constructData(null, createValue());
      return testFunction(data);
    });

    it('constructs appropriate fields and getters for event.data on "document.update" events', () => {
      let testFunction = datastore.document('path').onUpdate((event) => {
        expect(event.data.data()).to.deep.equal({key1: true, key2: 123});
        expect(event.data.get('key1')).to.equal(true);
        expect(event.data.previous.data()).to.deep.equal({key1: false, key2: 111});
        expect(event.data.previous.get('key1')).to.equal(false);
      });
      let data = constructData(createOldValue(), createValue());
      return testFunction(data);
    });

    it('constructs appropriate fields and getters for event.data on "document.delete" events', () => {
      let testFunction = datastore.document('path').onDelete((event) => {
        expect(event.data.data()).to.deep.equal({});
        expect(event.data.get('key1')).to.equal(null);
        expect(event.data.previous.data()).to.deep.equal({key1: false, key2: 111});
        expect(event.data.previous.get('key1')).to.equal(false);
      });
      let data = constructData(createOldValue(), null);
      return testFunction(data);
    });
  });

  describe('DeltaDocumentSnapshot', () => {
    it('should parse int values', () => {
      let snapshot = new datastore.DeltaDocumentSnapshot({'key': {'integerValue': '123'}}, {});
      expect(snapshot.data()).to.deep.equal({'key': 123});
    });

    it('should parse double values', () => {
      let snapshot = new datastore.DeltaDocumentSnapshot({'key': {'doubleValue': 12.34}}, {});
      expect(snapshot.data()).to.deep.equal({'key': 12.34});
    });

    it('should parse long values', () => {
      let snapshot = new datastore.DeltaDocumentSnapshot({'key': {'longValue': 12.34}}, {});
      expect(snapshot.data()).to.deep.equal({'key': 12.34});
    });

    it('should parse null values', () => {
      let snapshot = new datastore.DeltaDocumentSnapshot({'key': {'nullValue': null}}, {});
      expect(snapshot.data()).to.deep.equal({'key': null});
    });

    it('should parse boolean values', () => {
      let snapshot = new datastore.DeltaDocumentSnapshot({'key': {'booleanValue': true}}, {});
      expect(snapshot.data()).to.deep.equal({'key': true});
    });

    it('should parse string values', () => {
      let snapshot = new datastore.DeltaDocumentSnapshot({'key': {'stringValue': 'foo'}}, {});
      expect(snapshot.data()).to.deep.equal({'key': 'foo'});
    });

    it('should parse array values', () => {
      let raw = {'key': {
        'arrayValue': {
          'values': [
            { 'integerValue': '1' },
            { 'integerValue': '2' },
          ],
        },
      }};
      let snapshot = new datastore.DeltaDocumentSnapshot(raw, {});
      expect(snapshot.data()).to.deep.equal({'key': [1, 2]});
    });

    it('should parse object values', () => {
      let raw = {'keyParent': {
        'mapValue': {
          'fields': {
            'key1': {
              'stringValue': 'val1',
            },
            'key2': {
              'stringValue': 'val2',
            },
          },
        },
      }};
      let snapshot = new datastore.DeltaDocumentSnapshot(raw, {});
      expect(snapshot.data()).to.deep.equal({'keyParent': {'key1':'val1', 'key2':'val2'}});
    });

    it('should parse GeoPoint values', () => {
      let raw = {
        'geoPointValue': {
          'mapValue': {
            'fields': {
              'latitude': {
                'doubleValue': 40.73,
              },
              'longitude': {
                'doubleValue': -73.93,
              },
            },
          },
        },
      };
      let snapshot = new datastore.DeltaDocumentSnapshot(raw, {});
      expect(snapshot.data()).to.deep.equal({'geoPointValue': {
        'latitude': 40.73,
        'longitude': -73.93,
      }});
    });

    it('should parse reference values', () => {
      let raw = {
        'referenceVal': {
          'referenceValue': 'projects/proj1/databases/(default)/documents/doc1/id',
        },
      };
      let snapshot = new datastore.DeltaDocumentSnapshot(raw, {});
      // TODO: need to actually construct a reference
      expect(snapshot.data()).to.deep.equal({
        'referenceVal': 'projects/proj1/databases/(default)/documents/doc1/id',
      });
    });

    it('should parse timestamp values', () => {
      let raw = {
        'timestampVal': {
          'timestampValue': '2017-06-13T00:58:40.349Z',
        },
      };
      let snapshot = new datastore.DeltaDocumentSnapshot(raw, {});
      expect(snapshot.data()).to.deep.equal({'timestampVal': new Date('2017-06-13T00:58:40.349Z')});
    });

    it('should parse binary values', () => {
      // Format defined in https://developers.google.com/discovery/v1/type-format
      let raw = {
        'binaryVal': {
          'bytesValue': 'Zm9vYmFy',
        },
      };
      let snapshot = new datastore.DeltaDocumentSnapshot(raw, {});
      let binaryVal;
      try {
          binaryVal = Buffer.from('Zm9vYmFy', 'base64');
      } catch (e) { // Node version < 6, which is the case for Travis CI
          binaryVal = new Buffer('Zm9vYmFy', 'base64');
      }
      expect(snapshot.data()).to.deep.equal({'binaryVal': binaryVal});
    });
  });
});
