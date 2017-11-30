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

import * as firestore from '../../src/providers/firestore';
import { expect } from 'chai';

describe('Firestore Functions', () => {
  let constructValue = (fields) => {
    return {
      'fields': fields,
      'name': 'projects/pid/databases/(default)/documents/collection/123',
      'createTime': '2017-06-02T18:48:58.920638Z',
      'updateTime': '2017-07-02T18:48:58.920638Z',
    };
  };

  before(() => {
    process.env.GCLOUD_PROJECT = 'project1';
    process.env.FIREBASE_PROJECT = JSON.stringify({
      databaseUrl: 'project1@firebaseio.com',
    });
  });

  after(() => {
    delete process.env.GCLOUD_PROJECT;
  });

  describe('document builders and event types', () => {
    function expectedTrigger(resource: string, eventType: string) {
      return {
        eventTrigger: {
          resource,
          eventType: `providers/${firestore.provider}/eventTypes/${eventType}`,
        },
      };
    }

    it('should allow terse constructors', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let cloudFunction = firestore.document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('should allow custom namespaces', () => {
      let resource = 'projects/project1/databases/(default)/documents@v2/users/{uid}';
      let cloudFunction = firestore.namespace('v2').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('should allow custom databases', () => {
      let resource = 'projects/project1/databases/myDB/documents/users/{uid}';
      let cloudFunction = firestore.database('myDB').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('should allow both custom database and namespace', () => {
      let resource = 'projects/project1/databases/myDB/documents@v2/users/{uid}';
      let cloudFunction = firestore.database('myDB').namespace('v2').document('users/{uid}').onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(expectedTrigger(resource, 'document.write'));
    });

    it('onCreate should have the "document.create" eventType', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let eventType = firestore.document('users/{uid}').onCreate(() => null).__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(expectedTrigger(resource, 'document.create').eventTrigger.eventType);
    });

    it('onUpdate should have the "document.update" eventType', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let eventType = firestore.document('users/{uid}').onUpdate(() => null).__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(expectedTrigger(resource, 'document.update').eventTrigger.eventType);
    });

    it('onDelete should have the "document.delete" eventType', () => {
      let resource = 'projects/project1/databases/(default)/documents/users/{uid}';
      let eventType = firestore.document('users/{uid}').onDelete(() => null).__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(expectedTrigger(resource, 'document.delete').eventTrigger.eventType);
    });
  });

  describe('dataConstructor', () => {
    function constructEvent(oldValue: object, value: object) {
      return {
        'data': {
          'oldValue': oldValue,
          'value': value,
        },
        'resource': 'projects/pid/databases/(default)/documents/collection/123',
      };
    }

    function createOldValue() {
      return constructValue({
        'key1': {
          'booleanValue': false,
        },
        'key2': {
          'integerValue': '111',
        },
      });
    }

    function createValue() {
      return constructValue({
        'key1': {
          'booleanValue': true,
        },
        'key2': {
          'integerValue': '123',
        },
      });
    }

    it('constructs appropriate fields and getters for event.data on "document.write" events', () => {
      let testFunction = firestore.document('path').onWrite((event) => {
        expect(event.data.data()).to.deep.equal({key1: true, key2: 123});
        expect(event.data.get('key1')).to.equal(true);
        expect(event.data.previous.data()).to.deep.equal({key1: false, key2: 111});
        expect(event.data.previous.get('key1')).to.equal(false);
      });
      let data = constructEvent(createOldValue(), createValue());
      return testFunction(data);
    });

    it('constructs appropriate fields and getters for event.data on "document.create" events', () => {
      let testFunction = firestore.document('path').onCreate((event) => {
        expect(event.data.data()).to.deep.equal({key1: true, key2: 123});
        expect(event.data.get('key1')).to.equal(true);
        expect(event.data.previous).to.not.equal(null);
        expect(event.data.previous.exists).to.be.false;
      });
      let data = constructEvent({}, createValue());
      return testFunction(data);
    });

    it('constructs appropriate fields and getters for event.data on "document.update" events', () => {
      let testFunction = firestore.document('path').onUpdate((event) => {
        expect(event.data.data()).to.deep.equal({key1: true, key2: 123});
        expect(event.data.get('key1')).to.equal(true);
        expect(event.data.previous.data()).to.deep.equal({key1: false, key2: 111});
        expect(event.data.previous.get('key1')).to.equal(false);
      });
      let data = constructEvent(createOldValue(), createValue());
      return testFunction(data);
    });

    it('constructs appropriate fields and getters for event.data on "document.delete" events', () => {
      let testFunction = firestore.document('path').onDelete((event) => {
        expect(event.data.exists).to.equal(false);
        expect(event.data.previous.data()).to.deep.equal({key1: false, key2: 111});
        expect(event.data.previous.get('key1')).to.equal(false);
      });
      let data = constructEvent(createOldValue(), {});
      return testFunction(data);
    });
  });

  describe('DeltaDocumentSnapshot', () => {
    describe('#data()', () => {
      it('should parse int values', () => {
        let snapshot = firestore.dataConstructor({
          data: {
            value: constructValue({'key': {'integerValue': '123'}}),
          },
        });
        expect(snapshot.data()).to.deep.equal({'key': 123});
      });

      it('should parse double values', () => {
        let snapshot = firestore.dataConstructor({
          data: {
            value: constructValue({'key': {'doubleValue': 12.34}}),
          },
        });
        expect(snapshot.data()).to.deep.equal({'key': 12.34});
      });

      it('should parse null values', () => {
        let snapshot = firestore.dataConstructor({
          data: {
            value: constructValue({'key': {'nullValue': null}}),
          },
        });
        expect(snapshot.data()).to.deep.equal({'key': null});
      });

      it('should parse boolean values', () => {
        let snapshot = firestore.dataConstructor({
          data: {
            value: constructValue({'key': {'booleanValue': true}}),
          },
        });
        expect(snapshot.data()).to.deep.equal({'key': true});
      });

      it('should parse string values', () => {
        let snapshot = firestore.dataConstructor({
          data: {
            value: constructValue({'key': {'stringValue': 'foo'}}),
          },
        });
        expect(snapshot.data()).to.deep.equal({'key': 'foo'});
      });

      it('should parse array values', () => {
        let raw = constructValue({
          'key': {
            'arrayValue': {
              'values': [
                { 'integerValue': '1' },
                { 'integerValue': '2' },
              ],
            },
          },
        });
        let snapshot = firestore.dataConstructor({
          data: { value: raw },
        });
        expect(snapshot.data()).to.deep.equal({'key': [1, 2]});
      });

      it('should parse object values', () => {
        let raw = constructValue({
          'keyParent': {
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
          },
        });
        let snapshot = firestore.dataConstructor({
          data: { value: raw },
        });
        expect(snapshot.data()).to.deep.equal({'keyParent': {'key1':'val1', 'key2':'val2'}});
      });

      it('should parse GeoPoint values', () => {
        let raw = constructValue({
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
        });
        let snapshot = firestore.dataConstructor({
          data: { value: raw },
        });
        expect(snapshot.data()).to.deep.equal({'geoPointValue': {
          'latitude': 40.73,
          'longitude': -73.93,
        }});
      });

      it('should parse reference values', () => {
        let raw = constructValue({
          'referenceVal': {
            'referenceValue': 'projects/proj1/databases/(default)/documents/doc1/id',
          },
        });
        let snapshot = firestore.dataConstructor({
          data: { value: raw },
        });
        expect(snapshot.data()['referenceVal'].path).to.equal('doc1/id');
      });

      it('should parse timestamp values with precision to the millisecond', () => {
        let raw = constructValue({
          'timestampVal': {
            'timestampValue': '2017-06-13T00:58:40.349Z',
          },
        });
        let snapshot = firestore.dataConstructor({
          data: { value: raw },
        });
        expect(snapshot.data()).to.deep.equal({'timestampVal': new Date('2017-06-13T00:58:40.349Z')});
      });

      it('should parse timestamp values with precision to the second', () => {
        let raw = constructValue({
          'timestampVal': {
            'timestampValue': '2017-06-13T00:58:40Z',
          },
        });
        let snapshot = firestore.dataConstructor({
          data: { value: raw },
        });
        expect(snapshot.data()).to.deep.equal({'timestampVal': new Date('2017-06-13T00:58:40Z')});

      });

      it('should parse binary values', () => {
        // Format defined in https://developers.google.com/discovery/v1/type-format
        let raw = constructValue({
          'binaryVal': {
            'bytesValue': 'Zm9vYmFy',
          },
        });
        let snapshot = firestore.dataConstructor({
          data: { value: raw },
        });
        expect(snapshot.data()).to.deep.equal({'binaryVal': new Buffer('foobar')});
      });
    });

    describe('Other DocumentSnapshot methods', () => {
      let snapshot;

      before(() => {
        snapshot = firestore.dataConstructor({
          'data': {
            'value': {
              'fields': {'key': {'integerValue': '1'}},
              'createTime': '2017-06-17T14:45:17.876479Z',
              'updateTime': '2017-08-31T18:05:26.928527Z',
              'readTime': '2017-07-31T18:23:26.928527Z',
              'name': 'projects/pid/databases/(default)/documents/collection/123',
            },
          },
        });
      });

      it('should support #exists', () => {
        expect(snapshot.exists).to.be.true;
      });

      it('should support #ref', () => {
        expect(Object.keys(snapshot.ref)).to.deep.equal(['_firestore', '_referencePath']);
        expect(snapshot.ref.path).to.equal('collection/123');
      });

      it('should support #id', () => {
        expect(snapshot.id).to.equal('123');
      });

      it('should support #createTime', () => {
        expect(Date.parse(snapshot.createTime)).to.equal(Date.parse('2017-06-17T14:45:17.876479Z'));
      });

      it('should support #updateTime', () => {
        expect(Date.parse(snapshot.updateTime)).to.equal(Date.parse('2017-08-31T18:05:26.928527Z'));
      });

      it('should support #readTime', () => {
        expect(Date.parse(snapshot.readTime)).to.equal(Date.parse('2017-07-31T18:23:26.928527Z'));
      });
    });

    describe('Handle empty and non-existent documents', () => {
      it('constructs non-existent DocumentSnapshot when whole document deleted', () => {
        let snapshot = firestore.dataConstructor({
          'data': {
            'value': {}, // value is empty when the whole document is deleted
          },
          'resource': 'projects/pid/databases/(default)/documents/collection/123',
        });
        expect(snapshot.exists).to.be.false;
        expect(snapshot.ref.path).to.equal('collection/123');
      });

      it('constructs existent DocumentSnapshot with empty data when all fields of document deleted', () => {
        let snapshot = firestore.dataConstructor({
          'data': {
            'value': {  // value is not empty when document still exists
              'createTime': '2017-06-02T18:48:58.920638Z',
              'updateTime': '2017-07-02T18:48:58.920638Z',
              'name': 'projects/pid/databases/(default)/documents/collection/123',
            },
          },
        });
        expect(snapshot.exists).to.be.true;
        expect(snapshot.ref.path).to.equal('collection/123');
        expect(snapshot.data()).to.deep.equal({});
        expect(snapshot.get('key1')).to.equal(undefined);
      });
    });
  });
});
