import admin from "firebase-admin";
import { timeout } from "../utils";
import { PubSub } from "@google-cloud/pubsub";
import { initializeFirebase } from "../firebaseSetup";

describe("Pub/Sub (v1)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  const region = process.env.REGION;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const topicName = `firebase-schedule-${testId}-v1-pubsubScheduleTests-${region}`;

  if (!testId || !projectId || !region || !serviceAccountPath) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("pubsubOnPublishTests").doc(testId).delete();
    await admin.firestore().collection("pubsubScheduleTests").doc(topicName).delete();
  });

  describe("onPublish trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const serviceAccount = await import(serviceAccountPath);
      const topic = new PubSub({
        credentials: serviceAccount.default,
        projectId,
      }).topic("pubsubTests");

      await topic.publish(Buffer.from(JSON.stringify({ testId })));

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("pubsubOnPublishTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have a topic as resource", () => {
      expect(loggedContext?.resource.name).toEqual(
        `projects/${process.env.PROJECT_ID}/topics/pubsubTests`
      );
    });

    it("should not have a path", () => {
      expect(loggedContext?.path).toBeUndefined();
    });

    it("should have the correct eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.pubsub.topic.publish");
    });

    it("should have an eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should not have action", () => {
      expect(loggedContext?.action).toBeUndefined();
    });

    it("should have admin auth", () => {
      expect(loggedContext?.auth).toBeUndefined();
    });

    it("should have pubsub data", () => {
      const decodedMessage = JSON.parse(loggedContext?.message);
      const decoded = new Buffer(decodedMessage.data, "base64").toString();
      const parsed = JSON.parse(decoded);
      expect(parsed.testId).toEqual(testId);
    });
  });

  describe("schedule trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const pubsub = new PubSub();

      const message = Buffer.from(JSON.stringify({ testId }));

      await pubsub.topic(topicName).publish(message);

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("pubsubScheduleTests")
        .doc(topicName)
        .get();
      loggedContext = logSnapshot.data();
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have been called", () => {
      expect(loggedContext).toBeDefined();
    });
  });
});
