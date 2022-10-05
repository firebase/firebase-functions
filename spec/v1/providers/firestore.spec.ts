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

import { expect } from "chai";
import { Timestamp } from "firebase-admin/firestore";

import * as functions from "../../../src/v1";
import * as firestore from "../../../src/v1/providers/firestore";
import { expectType } from "../../common/metaprogramming";
import { MINIMAL_V1_ENDPOINT } from "../../fixtures";

describe("Firestore Functions", () => {
  function constructValue(fields: any) {
    return {
      fields,
      name: "projects/pid/databases/(default)/documents/collection/123",
      createTime: "2017-06-02T18:48:58.920638Z",
      updateTime: "2017-07-02T18:48:58.920638Z",
    };
  }

  function makeEvent(data: any, context?: { [key: string]: any }) {
    context = context || {};
    return {
      data,
      context: {
        eventId: "123",
        timestamp: "2018-07-03T00:49:04.264Z",
        eventType: "google.firestore.document.create",
        resource: {
          name: "projects/myproj/databases/(default)/documents/tests/test1",
          service: "service",
        },
        ...context,
      },
    };
  }

  function constructEvent(oldValue: object, value: object) {
    return {
      data: {
        oldValue,
        value,
      },
      context: {
        resource: {
          name: "resource",
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
        integerValue: "111",
      },
    });
  }

  function createValue() {
    return constructValue({
      key1: {
        booleanValue: true,
      },
      key2: {
        integerValue: "123",
      },
    });
  }

  describe("document builders and event types", () => {
    function expectedEndpoint(resource: string, eventType: string) {
      return {
        ...MINIMAL_V1_ENDPOINT,
        platform: "gcfv1",
        eventTrigger: {
          eventFilters: {
            resource,
          },
          eventType: `providers/cloud.firestore/eventTypes/${eventType}`,
          retry: false,
        },
        labels: {},
      };
    }

    before(() => {
      process.env.GCLOUD_PROJECT = "project1";
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it("should allow terse constructors", () => {
      const resource = "projects/project1/databases/(default)/documents/users/{uid}";
      const cloudFunction = firestore.document("users/{uid}").onWrite((snap, context) => {
        expectType<{ uid: string }>(context.params);
      });

      expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint(resource, "document.write"));
    });

    it("should allow custom namespaces", () => {
      const resource = "projects/project1/databases/(default)/documents@v2/users/{uid}";
      const cloudFunction = firestore
        .namespace("v2")
        .document("users/{uid}")
        .onWrite((snap, context) => {
          expectType<{ uid: string }>(context.params);
        });

      expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint(resource, "document.write"));
    });

    it("should allow custom databases", () => {
      const resource = "projects/project1/databases/myDB/documents/users/{uid}";
      const cloudFunction = firestore
        .database("myDB")
        .document("users/{uid}")
        .onWrite(() => null);

      expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint(resource, "document.write"));
    });

    it("should allow both custom database and namespace", () => {
      const resource = "projects/project1/databases/myDB/documents@v2/users/{uid}";
      const cloudFunction = firestore
        .database("myDB")
        .namespace("v2")
        .document("users/{uid}")
        .onWrite((snap, context) => {
          expectType<{ uid: string }>(context.params);
        });

      expect(cloudFunction.__endpoint).to.deep.equal(expectedEndpoint(resource, "document.write"));
    });

    it("should allow both region and runtime options to be set", () => {
      const fn = functions
        .region("us-east1")
        .runWith({
          timeoutSeconds: 90,
          memory: "256MB",
        })
        .firestore.document("doc")
        .onCreate((snap, context) => {
          expectType<Record<string, string>>(context.params);
        });

      expect(fn.__endpoint.region).to.deep.equal(["us-east1"]);
      expect(fn.__endpoint.availableMemoryMb).to.deep.equal(256);
      expect(fn.__endpoint.timeoutSeconds).to.deep.equal(90);
    });
  });

  describe("process.env.GCLOUD_PROJECT not set", () => {
    it("should not throw if __endpoint is not accessed", () => {
      expect(() => firestore.document("input").onCreate(() => null)).to.not.throw(Error);
    });

    it("should throw when endpoint is accessed", () => {
      expect(() => firestore.document("input").onCreate(() => null).__endpoint).to.throw(Error);
    });

    it("should not throw when #run is called", () => {
      const cf = firestore.document("input").onCreate(() => null);
      expect(cf.run).to.not.throw(Error);
    });
  });

  describe("dataConstructor", () => {
    before(() => {
      process.env.GCLOUD_PROJECT = "project1";
    });

    after(() => {
      delete process.env.GCLOUD_PROJECT;
    });

    it('constructs appropriate fields and getters for event.data on "document.write" events', () => {
      const testFunction = firestore.document("path").onWrite((change) => {
        expect(change.before.data()).to.deep.equal({
          key1: false,
          key2: 111,
        });
        expect(change.before.get("key1")).to.equal(false);
        expect(change.after.data()).to.deep.equal({ key1: true, key2: 123 });
        expect(change.after.get("key1")).to.equal(true);
        return true; // otherwise will get warning about returning undefined
      });
      const event = constructEvent(createOldValue(), createValue());
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs appropriate fields and getters for event.data on "document.create" events', () => {
      const testFunction = firestore.document("path").onCreate((data) => {
        expect(data.data()).to.deep.equal({ key1: true, key2: 123 });
        expect(data.get("key1")).to.equal(true);
        return true; // otherwise will get warning about returning undefined
      });
      const event = constructEvent({}, createValue());
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs appropriate fields and getters for event.data on "document.update" events', () => {
      const testFunction = firestore.document("path").onUpdate((change) => {
        expect(change.before.data()).to.deep.equal({
          key1: false,
          key2: 111,
        });
        expect(change.before.get("key1")).to.equal(false);
        expect(change.after.data()).to.deep.equal({ key1: true, key2: 123 });
        expect(change.after.get("key1")).to.equal(true);
        return true; // otherwise will get warning about returning undefined
      });
      const event = constructEvent(createOldValue(), createValue());
      return testFunction(event.data, event.context);
    }).timeout(5000);

    it('constructs appropriate fields and getters for event.data on "document.delete" events', () => {
      const testFunction = firestore.document("path").onDelete((data) => {
        expect(data.data()).to.deep.equal({ key1: false, key2: 111 });
        expect(data.get("key1")).to.equal(false);
        return true; // otherwise will get warning about returning undefined
      });
      const event = constructEvent(createOldValue(), {});
      return testFunction(event.data, event.context);
    }).timeout(5000);
  });

  describe("SnapshotConstructor", () => {
    describe("#data()", () => {
      it("should parse int values", () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { integerValue: "123" } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: 123 });
      });

      it("should parse double values", () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { doubleValue: 12.34 } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: 12.34 });
      });

      it("should parse null values", () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { nullValue: null } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: null });
      });

      it("should parse boolean values", () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { booleanValue: true } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: true });
      });

      it("should parse string values", () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: constructValue({ key: { stringValue: "foo" } }),
          })
        );
        expect(snapshot.data()).to.deep.equal({ key: "foo" });
      });

      it("should parse array values", () => {
        const raw = constructValue({
          key: {
            arrayValue: {
              values: [{ integerValue: "1" }, { integerValue: "2" }],
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

      it("should parse object values", () => {
        const raw = constructValue({
          keyParent: {
            mapValue: {
              fields: {
                key1: {
                  stringValue: "val1",
                },
                key2: {
                  stringValue: "val2",
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
          keyParent: { key1: "val1", key2: "val2" },
        });
      });

      it("should parse GeoPoint values", () => {
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

      it("should parse reference values", () => {
        const raw = constructValue({
          referenceVal: {
            referenceValue: "projects/proj1/databases/(default)/documents/doc1/id",
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()?.referenceVal?.path).to.equal("doc1/id");
      });

      it("should parse timestamp values with precision to the millisecond", () => {
        const raw = constructValue({
          timestampVal: {
            timestampValue: "2017-06-13T00:58:40.349Z",
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          timestampVal: Timestamp.fromDate(new Date("2017-06-13T00:58:40.349Z")),
        });
      });

      it("should parse timestamp values with precision to the second", () => {
        const raw = constructValue({
          timestampVal: {
            timestampValue: "2017-06-13T00:58:40Z",
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          timestampVal: Timestamp.fromDate(new Date("2017-06-13T00:58:40Z")),
        });
      });

      it("should parse binary values", () => {
        // Format defined in https://developers.google.com/discovery/v1/type-format
        const raw = constructValue({
          binaryVal: {
            bytesValue: "Zm9vYmFy",
          },
        });
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: raw,
          })
        );
        expect(snapshot.data()).to.deep.equal({
          binaryVal: Buffer.from("foobar"),
        });
      });
    });

    describe("Other DocumentSnapshot methods", () => {
      let snapshot: FirebaseFirestore.DocumentSnapshot;
      let newSnapshot: FirebaseFirestore.DocumentSnapshot;

      before(() => {
        snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: {
              fields: { key: { integerValue: "1" } },
              createTime: "2017-06-17T14:45:17.876479Z",
              updateTime: "2017-08-31T18:05:26.928527Z",
              readTime: "2017-07-31T18:23:26.928527Z",
              name: "projects/pid/databases/(default)/documents/collection/123",
            },
          })
        );
        newSnapshot = firestore.snapshotConstructor(
          makeEvent({
            value: {
              fields: { key: { integerValue: "2" } },
              createTime: "2017-06-17T14:45:17.876479Z",
              updateTime: "2017-06-17T14:45:17.876479Z",
              name: "projects/pid/databases/(default)/documents/collection/124",
            },
          })
        );
      });

      it("should support #exists", () => {
        expect(snapshot.exists).to.be.true;
      });

      it("should support #ref", () => {
        expect(snapshot.ref.path).to.equal("collection/123");
      });

      it("should support #id", () => {
        expect(snapshot.id).to.equal("123");
      });

      it("should support #createTime", () => {
        expect(snapshot.createTime.seconds).to.be.a("number");
        expect(snapshot.createTime.nanoseconds).to.be.a("number");
      });

      it("should support #updateTime", () => {
        expect(snapshot.updateTime.seconds).to.be.a("number");
        expect(snapshot.updateTime.nanoseconds).to.be.a("number");
      });

      it("should support #readTime", () => {
        expect(snapshot.readTime.seconds).to.be.a("number");
        expect(snapshot.readTime.nanoseconds).to.be.a("number");
        expect(newSnapshot.readTime.seconds).to.be.a("number");
        expect(newSnapshot.readTime.nanoseconds).to.be.a("number");
      });
    });

    describe("Handle empty and non-existent documents", () => {
      it("constructs non-existent DocumentSnapshot when whole document deleted", () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent(
            {
              value: {}, // value is empty when the whole document is deleted
            },
            {
              resource: {
                name: "projects/pid/databases/(default)/documents/collection/123",
              },
            }
          )
        );
        expect(snapshot.exists).to.be.false;
        expect(snapshot.ref.path).to.equal("collection/123");
      });

      it("constructs existent DocumentSnapshot with empty data when all fields of document deleted", () => {
        const snapshot = firestore.snapshotConstructor(
          makeEvent({
            value: {
              // value is not empty when document still exists
              createTime: "2017-06-02T18:48:58.920638Z",
              updateTime: "2017-07-02T18:48:58.920638Z",
              name: "projects/pid/databases/(default)/documents/collection/123",
            },
          })
        );
        expect(snapshot.exists).to.be.true;
        expect(snapshot.ref.path).to.equal("collection/123");
        expect(snapshot.data()).to.deep.equal({});
        expect(snapshot.get("key1")).to.equal(undefined);
      });
    });
  });
});
