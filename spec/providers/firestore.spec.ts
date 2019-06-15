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
import * as admin from 'firebase-admin';
import * as _ from 'lodash';

import * as functions from '../../src/index';
import * as firestore from '../../src/providers/firestore';

describe('Firestore Functions', () => {
  function constructValue(fields: any) {
    return {
      fields,
      name: 'projects/pid/databases/(default)/documents/collection/123',
      createTime: '2017-06-02T18:48:58.920638Z',
      updateTime: '2017-07-02T18:48:58.920638Z',
    };
  }

  function makeEvent(data: any, context?: { [key: string]: any }) {
    context = context || {};
    return {
      data,
      context: _.merge(
        {
          eventId: '123',
          timestamp: '2018-07-03T00:49:04.264Z',
          eventType: 'google.firestore.document.create',
          resource: {
            name: 'projects/myproj/databases/(default)/documents/tests/test1',
            service: 'service',
          },
        },
        context
      ),
    };
  }

  function constructEvent(oldValue: object, value: object, eventType: string) {
    return {
      data: {
        oldValue,
        value,
      },
      context: {
        resource: {
          name: 'resource',
        },
      },
    };
  }

  function createOldValue() {
    return constructValue({
      key1: {
        booleanValue: false,
      },
      key2: {
        integerValue: '111',
      },
    });
  }

  function createValue() {
    return constructValue({
      key1: {
        booleanValue: true,
      },
      key2: {
        integerValue: '123',
      },
    });
  }

  describe('document builders and event types', () => {
    function expectedTrigger(resource: string, eventType: string) {
      return {
        eventTrigger: {
          resource,
          eventType: `providers/cloud.firestore/eventTypes/${eventType}`,
          service: 'firestore.googleapis.com',
        },
      };
    }

    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('should allow terse constructors', () => {
      const resource =
        'projects/project1/databases/(default)/documents/users/{uid}';
      const cloudFunction = firestore
        .document('users/{uid}')
        .onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(
        expectedTrigger(resource, 'document.write')
      );
    });

    it('should allow custom namespaces', () => {
      const resource =
        'projects/project1/databases/(default)/documents@v2/users/{uid}';
      const cloudFunction = firestore
        .namespace('v2')
        .document('users/{uid}')
        .onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(
        expectedTrigger(resource, 'document.write')
      );
    });

    it('should allow custom databases', () => {
      const resource = 'projects/project1/databases/myDB/documents/users/{uid}';
      const cloudFunction = firestore
        .database('myDB')
        .document('users/{uid}')
        .onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(
        expectedTrigger(resource, 'document.write')
      );
    });

    it('should allow both custom database and namespace', () => {
      const resource =
        'projects/project1/databases/myDB/documents@v2/users/{uid}';
      const cloudFunction = firestore
        .database('myDB')
        .namespace('v2')
        .document('users/{uid}')
        .onWrite(() => null);
      expect(cloudFunction.__trigger).to.deep.equal(
        expectedTrigger(resource, 'document.write')
      );
    });

    it('should allow both region and runtime options to be set', () => {
      const fn = functions
        .region('us-east1')
        .runWith({
          timeoutSeconds: 90,
          memory: '256MB',
        })
        .firestore.document('doc')
        .onCreate((snap) => snap);

      expect(fn.__trigger.regions).to.deep.equal(['us-east1']);
      expect(fn.__trigger.availableMemoryMb).to.deep.equal(256);
      expect(fn.__trigger.timeout).to.deep.equal('90s');
    });

    it('onCreate should have the "document.create" eventType', () => {
      const resource =
        'projects/project1/databases/(default)/documents/users/{uid}';
      const eventType = firestore.document('users/{uid}').onCreate(() => null)
        .__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(
        expectedTrigger(resource, 'document.create').eventTrigger.eventType
      );
    });

    it('onUpdate should have the "document.update" eventType', () => {
      const resource =
        'projects/project1/databases/(default)/documents/users/{uid}';
      const eventType = firestore.document('users/{uid}').onUpdate(() => null)
        .__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(
        expectedTrigger(resource, 'document.update').eventTrigger.eventType
      );
    });

    it('onDelete should have the "document.delete" eventType', () => {
      const resource =
        'projects/project1/databases/(default)/documents/users/{uid}';
      const eventType = firestore.document('users/{uid}').onDelete(() => null)
        .__trigger.eventTrigger.eventType;
      expect(eventType).to.eq(
        expectedTrigger(resource, 'document.delete').eventTrigger.eventType
      );
    });
  });

  describe('process.env.GCLOUD_PROJECT not set', () => {
    it('should not throw if __trigger is not accessed', () => {
      expect(() =>
        firestore.document('input').onCreate(() => null)
      ).to.not.throw(Error);
    });

    it('should throw when trigger is accessed', () => {
      expect(
        () => firestore.document('input').onCreate(() => null).__trigger
      ).to.throw(Error);
    });

    it('should not throw when #run is called', () => {
      const cf = firestore.document('input').onCreate(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });

  describe('dataConstructor', () => {
    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('constructs appropriate fields and getters for event.data on "document.write" events', () => {
      const testFunction = firestore
        .document('path')
        .onWrite((change, context) => {
          expect(change.before.data()).to.deep.equal({
            key1: false,
            key2: 111,
          });
          expect(change.before.get('key1')).to.equal(false);
          expect(change.after.data()).to.deep.equal({ key1: true, key2: 123 });
          expect(change.after.get('key1')).to.equal(true);
          return true; // otherwise will get warning about returning undefined
        });
      const event = constructEvent(
        createOldValue(),
        createValue(),
        'document.write'
      );
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs appropriate fields and getters for event.data on "document.create" events', () => {
      const testFunction = firestore
        .document('path')
        .onCreate((data, context) => {
          expect(data.data()).to.deep.equal({ key1: true, key2: 123 });
          expect(data.get('key1')).to.equal(true);
          return true; // otherwise will get warning about returning undefined
        });
      const event = constructEvent({}, createValue(), 'document.create');
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs appropriate fields and getters for event.data on "document.update" events', () => {
      const testFunction = firestore
        .document('path')
        .onUpdate((change, context) => {
          expect(change.before.data()).to.deep.equal({
            key1: false,
            key2: 111,
          });
          expect(change.before.get('key1')).to.equal(false);
          expect(change.after.data()).to.deep.equal({ key1: true, key2: 123 });
          expect(change.after.get('key1')).to.equal(true);
          return true; // otherwise will get warning about returning undefined
        });
      const event = constructEvent(
        createOldValue(),
        createValue(),
        'document.update'
      );
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs appropriate fields and getters for event.data on "document.delete" events', () => {
      const testFunction = firestore
        .document('path')
        .onDelete((data, context) => {
          expect(data.data()).to.deep.equal({ key1: false, key2: 111 });
          expect(data.get('key1')).to.equal(false);
          return true; // otherwise will get warning about returning undefined
        });
      const event = constructEvent(createOldValue(), {}, 'document.delete');
      return testFunction(event.data, event.context);
    }).timeout(5000);
  });

  describe('handler namespace', () => {
    before(() => {
      process.env.GCLOUD_PROJECT = 'project1';
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('constructs correct data type and sets trigger to {} on "document.write" events', () => {
      const testFunction = functions.handler.firestore.document.onWrite(
        (change, context) => {
          expect(change.before.data()).to.deep.equal({
            key1: false,
            key2: 111,
          });
          expect(change.before.get('key1')).to.equal(false);
          expect(change.after.data()).to.deep.equal({ key1: true, key2: 123 });
          expect(change.after.get('key1')).to.equal(true);
          return true; // otherwise will get warning about returning undefined
        }
      );
      expect(testFunction.__trigger).to.deep.equal({});
      const event = constructEvent(
        createOldValue(),
        createValue(),
        'document.write'
      );
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs correct data type and sets trigger to {} on "document.create" events', () => {
      const testFunction = functions.handler.firestore.document.onCreate(
        (data, context) => {
          expect(data.data()).to.deep.equal({ key1: true, key2: 123 });
          expect(data.get('key1')).to.equal(true);
          return true; // otherwise will get warning about returning undefined
        }
      );
      expect(testFunction.__trigger).to.deep.equal({});
      const event = constructEvent({}, createValue(), 'document.create');
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs correct data type and sets trigger to {} on "document.update" events', () => {
      const testFunction = functions.handler.firestore.document.onUpdate(
        (change) => {
          expect(change.before.data()).to.deep.equal({
            key1: false,
            key2: 111,
          });
          expect(change.before.get('key1')).to.equal(false);
          expect(change.after.data()).to.deep.equal({ key1: true, key2: 123 });
          expect(change.after.get('key1')).to.equal(true);
          return true; // otherwise will get warning about returning undefined
        }
      );
      expect(testFunction.__trigger).to.deep.equal({});
      const event = constructEvent(
        createOldValue(),
        createValue(),
        'document.update'
      );
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs correct data type and sets trigger to {} on "document.delete" events', () => {
      const testFunction = functions.handler.firestore.document.onDelete(
        (data, context) => {
          expect(data.data()).to.deep.equal({ key1: false, key2: 111 });
          expect(data.get('key1')).to.equal(false);
          return true; // otherwise will get warning about returning undefined
        }
      );
      const event = constructEvent(createOldValue(), {}, 'document.delete');
      expect(testFunction.__trigger).to.deep.equal({});
      return testFunction(event.data, event.context);
    }).timeout(5000);
  });

  describe('SnapshotConstructor', () => {
    describe('#data()', () => {
      it('should parse int values', () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { integerValue: '123' } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: 123 });
      });

      it('should parse double values', () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { doubleValue: 12.34 } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: 12.34 });
      });

      it('should parse null values', () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { nullValue: null } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: null });
      });

      it('should parse boolean values', () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { booleanValue: true } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: true });
      });

      it('should parse string values', () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { stringValue: 'foo' } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: 'foo' });
      });

      it('should parse array values', () => {
        const raw = constructValue({
          key: {
            arrayValue: {
              values: [{ integerValue: '1' }, { integerValue: '2' }],
            },
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: [1, 2] });
      });

      it('should parse object values', () => {
        const raw = constructValue({
          keyParent: {
            mapValue: {
              fields: {
                key1: {
                  stringValue: 'val1',
                },
                key2: {
                  stringValue: 'val2',
                },
              },
            },
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          keyParent: { key1: 'val1', key2: 'val2' },
        });
      });

      it('should parse GeoPoint values', () => {
        const raw = constructValue({
          geoPointValue: {
            mapValue: {
              fields: {
                latitude: {
                  doubleValue: 40.73,
                },
                longitude: {
                  doubleValue: -73.93,
                },
              },
            },
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          geoPointValue: {
            latitude: 40.73,
            longitude: -73.93,
          },
        });
      });

      it('should parse reference values', () => {
        const raw = constructValue({
          referenceVal: {
            referenceValue:
              'projects/proj1/databases/(default)/documents/doc1/id',
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(_.get(snapshot.data(), 'referenceVal').path).to.equal('doc1/id');
      });

      it('should parse timestamp values with precision to the millisecond', () => {
        const raw = constructValue({
          timestampVal: {
            timestampValue: '2017-06-13T00:58:40.349Z',
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          timestampVal: admin.firestore.Timestamp.fromDate(
            new Date('2017-06-13T00:58:40.349Z')
          ),
        });
      });

      it('should parse timestamp values with precision to the second', () => {
        const raw = constructValue({
          timestampVal: {
            timestampValue: '2017-06-13T00:58:40Z',
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          timestampVal: admin.firestore.Timestamp.fromDate(
            new Date('2017-06-13T00:58:40Z')
          ),
        });
      });

      it('should parse binary values', () => {
        // Format defined in https://developers.google.com/discovery/v1/type-format
        const raw = constructValue({
          binaryVal: {
            bytesValue: 'Zm9vYmFy',
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          binaryVal: new Buffer('foobar'),
        });
      });
    });

    describe('Other DocumentSnapshot methods', () => {
      let snapshot: FirebaseFirestore.DocumentSnapshot;

      before(() => {
        snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: {
              fields: { key: { integerValue: '1' } },
              createTime: '2017-06-17T14:45:17.876479Z',
              updateTime: '2017-08-31T18:05:26.928527Z',
              readTime: '2017-07-31T18:23:26.928527Z',
              name: 'projects/pid/databases/(default)/documents/collection/123',
            },
          })
        );
      });

      it('should support #exists', () => {
        expect(snapshot.exists).to.be.true;
      });

      it('should support #ref', () => {
        expect(snapshot.ref.path).to.equal('collection/123');
      });

      it('should support #id', () => {
        expect(snapshot.id).to.equal('123');
      });

      it('should support #createTime', () => {
        expect(snapshot.createTime.seconds).to.be.a('number');
        expect(snapshot.createTime.nanoseconds).to.be.a('number');
      });

      it('should support #updateTime', () => {
        expect(snapshot.updateTime.seconds).to.be.a('number');
        expect(snapshot.updateTime.nanoseconds).to.be.a('number');
      });

      it('should support #readTime', () => {
        expect(snapshot.readTime.seconds).to.be.a('number');
        expect(snapshot.readTime.nanoseconds).to.be.a('number');
      });
    });

    describe('Handle empty and non-existent documents', () => {
      it('constructs non-existent DocumentSnapshot when whole document deleted', () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent(
            {
              value: {}, // value is empty when the whole document is deleted
            },
            {
              resource: {
                name:
                  'projects/pid/databases/(default)/documents/collection/123',
              },
            }
          )
        );
        expect(snapshot.exists).to.be.false;
        expect(snapshot.ref.path).to.equal('collection/123');
      });

      it('constructs existent DocumentSnapshot with empty data when all fields of document deleted', () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: {
              // value is not empty when document still exists
              createTime: '2017-06-02T18:48:58.920638Z',
              updateTime: '2017-07-02T18:48:58.920638Z',
              name: 'projects/pid/databases/(default)/documents/collection/123',
            },
          })
        );
        expect(snapshot.exists).to.be.true;
        expect(snapshot.ref.path).to.equal('collection/123');
        expect(snapshot.data()).to.deep.equal({});
        expect(snapshot.get('key1')).to.equal(undefined);
      });
    });
  });
});
