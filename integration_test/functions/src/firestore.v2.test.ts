import { describe, it, beforeAll, expect } from "vitest";
import { firestore } from "./utils";
import { GeoPoint } from "firebase-admin/firestore";
import { expectCloudEvent, expectFirestoreEvent } from "./assertions";
const RUN_ID = String(process.env.RUN_ID);

function waitForEvent<T = unknown>(
  event: string,
  trigger: () => Promise<void>,
  timeoutMs: number = 60_000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    let timer: NodeJS.Timeout | null = null;

    const unsubscribe = firestore
      .collection(RUN_ID)
      .doc(event)
      .onSnapshot((snapshot) => {
        if (snapshot.exists) {
          if (timer) clearTimeout(timer);
          unsubscribe();
          resolve(snapshot.data() as T);
        }
      });

    timer = setTimeout(() => {
      unsubscribe();
      reject(new Error(`Timeout waiting for event "${event}" after ${timeoutMs}ms`));
    }, timeoutMs);

    trigger().then().catch(reject);
  });
}

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
    });

    it("should be a CloudEvent", () => {
      expectCloudEvent(data);
    });

    it("should be a FirestoreEvent", () => {
      expectFirestoreEvent(data, documentId);
    });

    it("should be a QueryDocumentSnapshot", () => {
      const snapshot = data.data;
      expect(snapshot.exists).toBeTruthy();
      expect(snapshot.ref.path).toBe(`${RUN_ID}/onDocumentCreated`);
      expect(snapshot.id).toBe("onDocumentCreated");
      expect(snapshot.createTime).toBeDefined(); // check its a timestamp
      expect(snapshot.updateTime).toBeDefined(); // check its a timestamp
      expect(snapshot.readTime).toBeDefined(); // check its a timestamp
    });

    it("should have the correct data", () => {
      const snapshot = data.data;
      const snapshotData = snapshot.data();
      expect(snapshotData).toBeDefined();
      expect(snapshotData.foo).toBe("bar");
      expect(snapshotData.timestamp).toBeDefined(); // todo check iso date
      expect(snapshotData.geopoint).toBeDefined(); // not sure how this serializes
      expect(snapshotData.geopoint._type).toBe("geopoint");
      expect(snapshotData.geopoint.latitude).toBe(10);
      expect(snapshotData.geopoint.longitude).toBe(20);
    });
  });
});
