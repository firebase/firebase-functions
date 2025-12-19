import { describe, it, beforeAll, expect } from "vitest";
import { waitForEvent, RUN_ID } from "../utils";
import { firestore } from "../firebase.server";
import { GeoPoint } from "firebase-admin/firestore";
import {
  expectGeoPoint,
  expectQueryDocumentSnapshot,
  expectTimestamp,
} from "../assertions/firestore";

describe("firestore.v1", () => {
  describe("onDocumentCreated", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentCreatedV1", async () => {
        await firestore
          .collection(`integration_test/${RUN_ID}/oDocumentCreatedV1`)
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

    it("should be a QueryDocumentSnapshot", () => {
      expectQueryDocumentSnapshot(data, "oDocumentCreatedV1", documentId);
    });

    it("should have the correct data", () => {
      const value = data.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });

  describe("onDocumentUpdated", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentUpdatedV1", async () => {
        await firestore
          .collection(`integration_test/${RUN_ID}/oDocumentUpdatedV1`)
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

    it("should be a Change event with snapshots", () => {
      const before = data.before;
      const after = data.after;
      expectQueryDocumentSnapshot(before, "oDocumentUpdatedV1", documentId);
      expectQueryDocumentSnapshot(after, "oDocumentUpdatedV1", documentId);
    });

    it("before event should have the correct data", () => {
      const value = data.before.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });

    it("after event should have the correct data", () => {
      const value = data.after.data;
      expect(value.foo).toBe("baz");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });

  describe("onDocumentDeleted", () => {
    let data: any;
    let documentId: string;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentDeletedV1", async () => {
        const docRef = await firestore
          .collection(`integration_test/${RUN_ID}/oDocumentDeletedV1`)
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

    it("should be a QueryDocumentSnapshot", () => {
      expectQueryDocumentSnapshot(data, "oDocumentDeletedV1", documentId);
    });

    it("should have the correct data", () => {
      const value = data.data;
      expect(value.foo).toBe("bar");
      expectTimestamp(value.timestamp);
      expectGeoPoint(value.geopoint);
    });
  });
});
