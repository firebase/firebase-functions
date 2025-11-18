import EventEmitter from "node:events";
import { describe, it, beforeAll, expect } from "vitest";
import { PubSub } from "@google-cloud/pubsub";
import { firestore } from "./utils";
import { GeoPoint } from "firebase-admin/firestore";
const RUN_ID = String(process.env.RUN_ID);

const pubsub = new PubSub({ projectId: "cf3-integration-tests-v2-qa" });
const emitter = new EventEmitter();

function waitForEvent<T = unknown>(
  event: string,
  trigger: () => Promise<void>,
  timeoutMs: number = 60_000
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    emitter.on(event, (data: T) => {
      emitter.off(event, resolve);
      resolve(data);
    });

    setTimeout(() => {
      emitter.off(event, resolve);
      reject(new Error("Timeout waiting for event: " + event));
    }, timeoutMs);

    trigger().catch(reject);
  });
}

beforeAll(async () => {
  const topic = pubsub.topic('vitest');
  const subscription = topic.subscription('vitest-sub');

  subscription.on("message", (message) => {
    console.log("message", message.data.toString());
    const data = message.data.length ? JSON.parse(message.data.toString()) : null;
    message.ack();

    if (!("event" in data)) {
      throw new Error("Invalid event data: " + JSON.stringify(data));
    }

    emitter.emit(data.event, data.data);
  });

  subscription.on("error", (error) => {
    console.error("Pubsub error", error);
    process.exit(1);
  });
});

describe("firestore.v2", () => {
  describe("onDocumentCreated", () => {
    let data: any;

    beforeAll(async () => {
      data = await waitForEvent("onDocumentCreated", async () => {
        await firestore
          .collection(RUN_ID)
          .doc("onDocumentCreated")
          .set({
            foo: "bar",
            timestamp: new Date(),
            geopoint: new GeoPoint(10, 20),
          });
      });
    });

    it("should be a CloudEvent", () => {
      expect(data.specversion).toBe("1.0");
      expect(data.id).toBeDefined();
      expect(data.source).toBeDefined();
      expect(data.subject).toBeDefined();
      expect(data.type).toBeDefined();
      expect(data.time).toBeDefined(); // check its an iosdate
    });

    it("should be a FirestoreEvent", () => {
      expect(data.location).toBeDefined();
      expect(data.project).toBeDefined();
      expect(data.database).toBeDefined();
      expect(data.namespace).toBeDefined();
      expect(data.document).toBeDefined();
      expect(data.params).toBeDefined();
      expect(data.params.documentId).toBe("onDocumentCreated");
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
