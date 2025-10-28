// The MIT License (MIT)
//
// Copyright (c) 2023 Firebase
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
import { google } from "../../../protos/compiledFirestore";
import { PathPattern } from "../../../src/common/utilities/path-pattern";
import * as params from "../../../src/params";
import { onInit } from "../../../src/v2/core";
import * as firestore from "../../../src/v2/providers/firestore";

/** static-complied protobuf */
const DocumentEventData = google.events.cloud.firestore.v1.DocumentEventData;

const eventBase = {
  location: "us-central1",
  project: "my-project",
  database: "my-db",
  namespace: "my-ns",
  document: "foo/fGRodw71mHutZ4wGDuT8",
  datacontenttype: "application/protobuf",
  dataschema:
    "https://github.com/googleapis/google-cloudevents/blob/main/proto/google/events/cloud/firestore/v1/data.proto",
  id: "379ad868-5ef9-4c84-a8ba-f75f1b056663",
  source: "projects/my-project/databases/my-db/documents/d",
  subject: "documents/foo/fGRodw71mHutZ4wGDuT8",
  specversion: "1.0" as const,
  time: "2023-03-10T18:20:43.677647Z",
  type: "google.cloud.firestore.document.v1.created",
};

const expectedEndpointBase = {
  platform: "gcfv2",
  availableMemoryMb: {},
  concurrency: {},
  ingressSettings: {},
  maxInstances: {},
  minInstances: {},
  serviceAccountEmail: {},
  timeoutSeconds: {},
  vpc: {},
  labels: {},
};

function makeExpectedEp(eventType: string, eventFilters, eventFilterPathPatterns) {
  return {
    ...expectedEndpointBase,
    eventTrigger: {
      eventType,
      eventFilters,
      eventFilterPathPatterns,
      retry: false,
    },
  };
}

function makeEncodedProtobuf(data: any) {
  return DocumentEventData.encode(data).finish();
}

function makeEvent(data?: any): firestore.RawFirestoreEvent {
  return {
    ...eventBase,
    data,
  } as firestore.RawFirestoreEvent;
}

function makeAuthEvent(data?: any): firestore.RawFirestoreAuthEvent {
  return {
    ...eventBase,
    data,
    authid: "userId",
    authtype: "unknown",
  } as firestore.RawFirestoreAuthEvent;
}

const createdData = {
  value: {
    fields: {
      hello: { stringValue: "create world" },
    },
    createTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    updateTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    name: "projects/my-project/databases/my-db/documents/foo/fGRodw71mHutZ4wGDuT8",
  },
};
const createdProto = DocumentEventData.create(createdData);

const deletedData = {
  oldValue: {
    fields: {
      hello: { stringValue: "delete world" },
    },
    createTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    updateTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    name: "projects/my-project/databases/my-db/documents/foo/fGRodw71mHutZ4wGDuT8",
  },
};
const deletedProto = DocumentEventData.create(deletedData);

const updatedData = {
  value: {
    fields: {
      hello: { stringValue: "new world" },
    },
    createTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    updateTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    name: "projects/my-project/databases/my-db/documents/foo/fGRodw71mHutZ4wGDuT8",
  },
  oldValue: {
    fields: {
      hello: { stringValue: "old world" },
    },
    createTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    updateTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    name: "projects/my-project/databases/my-db/documents/foo/fGRodw71mHutZ4wGDuT8",
  },
  updateMask: {
    fieldPaths: ["hello"],
  },
};
const updatedProto = DocumentEventData.create(updatedData);

const writtenData = {
  value: {
    fields: {
      hello: { stringValue: "a new world" },
    },
    createTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    updateTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    name: "projects/my-project/databases/my-db/documents/foo/fGRodw71mHutZ4wGDuT8",
  },
  oldValue: {
    createTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    updateTime: Timestamp.fromDate(new Date("2023-03-10T00:58:40.349Z")),
    name: "projects/my-project/databases/my-db/documents/foo/fGRodw71mHutZ4wGDuT8",
  },
};
const writtenProto = DocumentEventData.create(writtenData);

describe("firestore", () => {
  let docParam: params.Expression<string>;
  let nsParam: params.Expression<string>;
  let dbParam: params.Expression<string>;

  before(() => {
    docParam = params.defineString("DOCUMENT");
    nsParam = params.defineString("NAMESPACE");
    dbParam = params.defineString("DATABASE");
  });

  after(() => {
    params.clearParams();
  });

  describe("onDocumentWritten", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.writtenEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentWritten("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.writtenEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentWritten(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with param opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.writtenEventType,
        {
          database: dbParam,
          namespace: nsParam,
        },
        {
          document: docParam,
        }
      );

      const func = firestore.onDocumentWritten(
        {
          database: dbParam,
          namespace: nsParam,
          document: docParam,
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentWritten("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onDocumentCreated", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentCreated("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentCreated(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with param opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventType,
        {
          database: dbParam,
          namespace: nsParam,
        },
        {
          document: docParam,
        }
      );

      const func = firestore.onDocumentCreated(
        {
          database: dbParam,
          namespace: nsParam,
          document: docParam,
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentCreated("type", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onDocumentUpdated", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.updatedEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentUpdated("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.updatedEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentUpdated(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with param opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.updatedEventType,
        {
          database: dbParam,
          namespace: nsParam,
        },
        {
          document: docParam,
        }
      );

      const func = firestore.onDocumentUpdated(
        {
          database: dbParam,
          namespace: nsParam,
          document: docParam,
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentUpdated("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onDocumentDeleted", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.deletedEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentDeleted("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.deletedEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentDeleted(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with param opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.deletedEventType,
        {
          database: dbParam,
          namespace: nsParam,
        },
        {
          document: docParam,
        }
      );

      const func = firestore.onDocumentDeleted(
        {
          database: dbParam,
          namespace: nsParam,
          document: docParam,
        },
        () => true
      );
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentDeleted("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onDocumentWrittenWithAuthContext", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.writtenEventWithAuthContextType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentWrittenWithAuthContext("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.writtenEventWithAuthContextType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentWrittenWithAuthContext(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentWrittenWithAuthContext("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onDocumentCreatedWithAuthContext", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventWithAuthContextType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentCreatedWithAuthContext("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventWithAuthContextType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentCreatedWithAuthContext(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentCreatedWithAuthContext("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onDocumentUpdatedWithAuthContext", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.updatedEventWithAuthContextType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentUpdatedWithAuthContext("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.updatedEventWithAuthContextType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentUpdatedWithAuthContext(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentUpdatedWithAuthContext("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("onDocumentDeletedWithAuthContext", () => {
    it("should create a func", () => {
      const expectedEp = makeExpectedEp(
        firestore.deletedEventWithAuthContextType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onDocumentDeletedWithAuthContext("foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.deletedEventWithAuthContextType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onDocumentDeletedWithAuthContext(
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("calls init function", async () => {
      const event: firestore.RawFirestoreEvent = {
        ...eventBase,
        datacontenttype: "application/json",
        data: {
          oldValue: null,
          value: null,
        },
      };

      let hello;
      onInit(() => (hello = "world"));
      expect(hello).to.be.undefined;
      await firestore.onDocumentDeletedWithAuthContext("path", () => null)(event);
      expect(hello).to.equal("world");
    });
  });

  describe("getOpts", () => {
    it("should handle document string", () => {
      const { document, database, namespace, opts } = firestore.getOpts("foo/{bar}");

      expect(document).to.eq("foo/{bar}");
      expect(database).to.eq("(default)");
      expect(namespace).to.eq("(default)");
      expect(opts).to.deep.eq({});
    });

    it("should parse and opts", () => {
      const documentOpts = {
        document: "foo/{bar}",
        database: "my-db",
        namespace: "my-ns",
        region: "us-central1",
      };

      const { document, database, namespace, opts } = firestore.getOpts(documentOpts);

      expect(document).to.eq("foo/{bar}");
      expect(database).to.eq("my-db");
      expect(namespace).to.eq("my-ns");
      expect(opts).to.deep.eq({ region: "us-central1" });
    });
  });

  describe("createSnapshot", () => {
    it("should throw an error on invalid content type", () => {
      expect(() =>
        firestore.createSnapshot({
          ...eventBase,
          datacontenttype: "something",
        } as any)
      ).to.throw("Error: Cannot parse event payload.");
    });

    it("should create snapshot of a protobuf encoded event if datacontexttype is missing", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(makeEncodedProtobuf(createdProto));
      delete rawEvent.datacontenttype;

      const snapshot = firestore.createSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "create world" });
    });

    it("should create snapshot of a protobuf encoded created event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(makeEncodedProtobuf(createdProto));

      const snapshot = firestore.createSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "create world" });
    });

    it("should create snapshot of a protobuf encoded updated event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(makeEncodedProtobuf(updatedProto));

      const snapshot = firestore.createSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "new world" });
    });

    it("should create snapshot of a protobuf encoded written event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(makeEncodedProtobuf(writtenProto));

      const snapshot = firestore.createSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "a new world" });
    });

    it("should create snapshot of a json encoded created event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(createdData);
      rawEvent.datacontenttype = "application/json";

      const snapshot = firestore.createSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "create world" });
    });

    it("should create snapshot of a json encoded updated event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(updatedData);
      rawEvent.datacontenttype = "application/json";

      const snapshot = firestore.createSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "new world" });
    });

    it("should create snapshot of a json encoded written event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(writtenData);
      rawEvent.datacontenttype = "application/json";

      const snapshot = firestore.createSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "a new world" });
    });
  });

  describe("createBeforeSnapshot", () => {
    it("should throw an error on invalid content type", () => {
      expect(() =>
        firestore.createBeforeSnapshot({
          ...eventBase,
          datacontenttype: "something",
        } as any)
      ).to.throw("Error: Cannot parse event payload.");
    });

    it("should create before snapshot of a protobuf encoded deleted event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(makeEncodedProtobuf(deletedProto));

      const snapshot = firestore.createBeforeSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "delete world" });
    });

    it("should create before snapshot of a protobuf encoded updated event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(makeEncodedProtobuf(updatedProto));

      const snapshot = firestore.createBeforeSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "old world" });
    });

    it("should create before snapshot of a protobuf encoded written event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(makeEncodedProtobuf(writtenProto));

      const snapshot = firestore.createBeforeSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({});
    });

    it("should create before snapshot of a json encoded deleted event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(deletedData);
      rawEvent.datacontenttype = "application/json";

      const snapshot = firestore.createBeforeSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "delete world" });
    });

    it("should create before snapshot of a json encoded updated event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(updatedData);
      rawEvent.datacontenttype = "application/json";

      const snapshot = firestore.createBeforeSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({ hello: "old world" });
    });

    it("should create before snapshot of a json encoded written event", () => {
      const rawEvent: firestore.RawFirestoreEvent = makeEvent(writtenData);
      rawEvent.datacontenttype = "application/json";

      const snapshot = firestore.createBeforeSnapshot(rawEvent);

      expect(snapshot.data()).to.deep.eq({});
    });
  });

  describe("makeParams", () => {
    it("should not extract matches with out a path pattern", () => {
      const params = firestore.makeParams(
        "foo/fGRodw71mHutZ4wGDuT8",
        new PathPattern("foo/fGRodw71mHutZ4wGDuT8")
      );

      expect(params).to.deep.eq({});
    });

    it("should extract matches with a path pattern", () => {
      const params = firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"));

      expect(params).to.deep.eq({
        bar: "fGRodw71mHutZ4wGDuT8",
      });
    });
  });

  describe("makeFirestoreEvent", () => {
    it("should make event from an event without data", () => {
      const event = firestore.makeFirestoreEvent(
        firestore.createdEventType,
        makeEvent(),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event.data).to.eq(undefined);
    });

    it("should make event from a created event", () => {
      const event = firestore.makeFirestoreEvent(
        firestore.createdEventType,
        makeEvent(makeEncodedProtobuf(createdProto)),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event.data.data()).to.deep.eq({ hello: "create world" });
    });

    it("should make event from a deleted event", () => {
      const event = firestore.makeFirestoreEvent(
        firestore.deletedEventType,
        makeEvent(makeEncodedProtobuf(deletedProto)),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event.data.data()).to.deep.eq({ hello: "delete world" });
    });

    it("should make event from a created event with auth context", () => {
      const event = firestore.makeFirestoreEvent(
        firestore.createdEventWithAuthContextType,
        makeAuthEvent(makeEncodedProtobuf(createdProto)),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event.data.data()).to.deep.eq({ hello: "create world" });
    });

    it("should include auth fields if provided in raw event", () => {
      const event = firestore.makeFirestoreEvent(
        firestore.createdEventWithAuthContextType,
        makeAuthEvent(makeEncodedProtobuf(createdProto)),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event).to.include({ authId: "userId", authType: "unknown" });
    });
  });

  describe("makeChangedFirestoreEvent", () => {
    it("should make event from an event without data", () => {
      const event = firestore.makeChangedFirestoreEvent(
        makeEvent(),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event.data).to.eq(undefined);
    });

    it("should make event from an updated event", () => {
      const event = firestore.makeChangedFirestoreEvent(
        makeEvent(makeEncodedProtobuf(updatedProto)),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event.data.before.data()).to.deep.eq({ hello: "old world" });
      expect(event.data.after.data()).to.deep.eq({ hello: "new world" });
    });

    it("should make event from a written event", () => {
      const event = firestore.makeChangedFirestoreEvent(
        makeEvent(makeEncodedProtobuf(writtenProto)),
        firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
      );

      expect(event.data.before.data()).to.deep.eq({});
      expect(event.data.after.data()).to.deep.eq({ hello: "a new world" });
    });
  });

  it("should include auth fields if provided in raw event", () => {
    const event = firestore.makeChangedFirestoreEvent(
      makeAuthEvent(makeEncodedProtobuf(writtenProto)),
      firestore.makeParams("foo/fGRodw71mHutZ4wGDuT8", new PathPattern("foo/{bar}"))
    );

    expect(event).to.include({ authId: "userId", authType: "unknown" });
  });

  describe("makeEndpoint", () => {
    it("should make an endpoint with a document path pattern", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const ep = firestore.makeEndpoint(
        firestore.createdEventType,
        { region: "us-central1" },
        "foo/{bar}",
        "my-db",
        "my-ns"
      );

      expect(ep).to.deep.eq(expectedEp);
    });

    it("should make an endpoint with a document filter", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventType,
        {
          database: "my-db",
          namespace: "my-ns",
          document: "foo/fGRodw71mHutZ4wGDuT8",
        },
        {}
      );
      expectedEp["region"] = ["us-central1"];

      const ep = firestore.makeEndpoint(
        firestore.createdEventType,
        { region: "us-central1" },
        "foo/fGRodw71mHutZ4wGDuT8",
        "my-db",
        "my-ns"
      );

      expect(ep).to.deep.eq(expectedEp);
    });
  });

  describe("onOperation", () => {
    it("should create a func on a created operation", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onOperation(firestore.createdEventType, "foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func on a created operation with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.createdEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onOperation(
        firestore.createdEventType,
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func on a deleted operation", () => {
      const expectedEp = makeExpectedEp(
        firestore.deletedEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onOperation(firestore.deletedEventType, "foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func on a deleted operation with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.deletedEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onOperation(
        firestore.deletedEventType,
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });
  });

  describe("onChangedOperation", () => {
    it("should create a func on a updated operation", () => {
      const expectedEp = makeExpectedEp(
        firestore.updatedEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onChangedOperation(firestore.updatedEventType, "foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func on a updated operation with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.updatedEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onChangedOperation(
        firestore.updatedEventType,
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func on a written operation", () => {
      const expectedEp = makeExpectedEp(
        firestore.writtenEventType,
        {
          database: "(default)",
          namespace: "(default)",
        },
        {
          document: "foo/{bar}",
        }
      );

      const func = firestore.onChangedOperation(firestore.writtenEventType, "foo/{bar}", () => 2);

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });

    it("should create a func on a written operation with opts", () => {
      const expectedEp = makeExpectedEp(
        firestore.writtenEventType,
        {
          database: "my-db",
          namespace: "my-ns",
        },
        {
          document: "foo/{bar}",
        }
      );
      expectedEp["region"] = ["us-central1"];

      const func = firestore.onChangedOperation(
        firestore.writtenEventType,
        {
          region: "us-central1",
          document: "foo/{bar}",
          database: "my-db",
          namespace: "my-ns",
        },
        () => 2
      );

      expect(func.run(true as any)).to.eq(2);
      expect(func.__endpoint).to.deep.eq(expectedEp);
    });
  });
});
