import { describe, it, beforeAll, expect } from "vitest";
import { waitForEvent, RUN_ID } from "../utils";
import { firestore } from "../firebase.server";
import { GeoPoint } from "firebase-admin/firestore";
import {
  expectCloudEvent,
  expectFirestoreAuthEvent,
  expectFirestoreEvent,
  expectGeoPoint,
  expectQueryDocumentSnapshot,
  expectTimestamp,
} from "../assertions/firestore";

describe("firestore.v2", () => {
  describe("onDocumentCreated", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentCreated", async () => {
        await firestore
          .collection(`integration_test/${RUN_ID}/onDocumentCreated`)
          .add({
            foo: "bar",
            timestamp: new Date(),
            geopoint: new GeoPoint(10, 20),
          })
          .then((doc) => {
            documentId = doc.id;
          });
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a FirestoreEvent", () => {
      expectFirestoreEvent(data, "onDocumentCreated", documentId);
    });

    it("should be a QueryDocumentSnapshot", () => {
      expectQueryDocumentSnapshot(data.eventData, "onDocumentCreated", documentId);
    });

    it("should have the correct data", () => {
      const value = data.eventData.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });

  describe("onDocumentUpdated", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentUpdated", async () => {
        await firestore
          .collection(`integration_test/${RUN_ID}/onDocumentUpdated`)
          .add({
            foo: "bar",
            timestamp: new Date(),
            geopoint: new GeoPoint(10, 20),
          })
          .then(async (doc) => {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await doc.update({
              foo: "baz",
            });
            return doc;
          })
          .then((doc) => {
            documentId = doc.id;
          });
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a FirestoreEvent", () => {
      expectFirestoreEvent(data, "onDocumentUpdated", documentId);
    });

    it("should be a Change event with snapshots", () => {
      const before = data.eventData.before;
      const after = data.eventData.after;
      expectQueryDocumentSnapshot(before, "onDocumentUpdated", documentId);
      expectQueryDocumentSnapshot(after, "onDocumentUpdated", documentId);
    });

    it("before event should have the correct data", () => {
      const value = data.eventData.before.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });

    it("after event should have the correct data", () => {
      const value = data.eventData.after.data;
      expect(value.foo).toBe("baz");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });

  describe("onDocumentDeleted", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentDeleted", async () => {
        const docRef = await firestore
          .collection(`integration_test/${RUN_ID}/onDocumentDeleted`)
          .add({
            foo: "bar",
            timestamp: new Date(),
            geopoint: new GeoPoint(10, 20),
          });
        documentId = docRef.id;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await docRef.delete();
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a FirestoreEvent", () => {
      expectFirestoreEvent(data, "onDocumentDeleted", documentId);
    });

    it("should be a QueryDocumentSnapshot", () => {
      expectQueryDocumentSnapshot(data.eventData, "onDocumentDeleted", documentId);
    });

    it("should have the correct data", () => {
      const value = data.eventData.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });

  describe("onDocumentCreatedWithAuthContext", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentCreatedWithAuthContext", async () => {
        await firestore
          .collection(`integration_test/${RUN_ID}/onDocumentCreatedWithAuthContext`)
          .add({
            foo: "bar",
            timestamp: new Date(),
            geopoint: new GeoPoint(10, 20),
          })
          .then((doc) => {
            documentId = doc.id;
          });
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a FirestoreAuthEvent", () => {
      expectFirestoreAuthEvent(data, "onDocumentCreatedWithAuthContext", documentId);
    });

    it("should be a QueryDocumentSnapshot", () => {
      expectQueryDocumentSnapshot(data.eventData, "onDocumentCreatedWithAuthContext", documentId);
    });

    it("should have the correct data", () => {
      const value = data.eventData.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });

  describe("onDocumentUpdatedWithAuthContext", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentUpdatedWithAuthContext", async () => {
        await firestore
          .collection(`integration_test/${RUN_ID}/onDocumentUpdatedWithAuthContext`)
          .add({
            foo: "bar",
            timestamp: new Date(),
            geopoint: new GeoPoint(10, 20),
          })
          .then(async (doc) => {
            await new Promise((resolve) => setTimeout(resolve, 3000));
            await doc.update({
              foo: "baz",
            });
            return doc;
          })
          .then((doc) => {
            documentId = doc.id;
          });
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a FirestoreAuthEvent", () => {
      expectFirestoreAuthEvent(data, "onDocumentUpdatedWithAuthContext", documentId);
    });

    it("should be a Change event with snapshots", () => {
      const before = data.eventData.before;
      const after = data.eventData.after;
      expectQueryDocumentSnapshot(before, "onDocumentUpdatedWithAuthContext", documentId);
      expectQueryDocumentSnapshot(after, "onDocumentUpdatedWithAuthContext", documentId);
    });

    it("before event should have the correct data", () => {
      const value = data.eventData.before.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });

    it("after event should have the correct data", () => {
      const value = data.eventData.after.data;
      expect(value.foo).toBe("baz");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });

  describe("onDocumentDeletedWithAuthContext", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentDeletedWithAuthContext", async () => {
        const docRef = await firestore
          .collection(`integration_test/${RUN_ID}/onDocumentDeletedWithAuthContext`)
          .add({
            foo: "bar",
            timestamp: new Date(),
            geopoint: new GeoPoint(10, 20),
          });
        documentId = docRef.id;
        await new Promise((resolve) => setTimeout(resolve, 3000));
        await docRef.delete();
      });
    }, 60_000);

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a FirestoreAuthEvent", () => {
      expectFirestoreAuthEvent(data, "onDocumentDeletedWithAuthContext", documentId);
    });

    it("should be a QueryDocumentSnapshot", () => {
      expectQueryDocumentSnapshot(data.eventData, "onDocumentDeletedWithAuthContext", documentId);
    });

    it("should have the correct data", () => {
      const value = data.eventData.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });
});
