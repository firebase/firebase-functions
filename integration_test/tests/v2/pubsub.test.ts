import admin from "firebase-admin";
import { timeout } from "../utils";
import { PubSub } from "@google-cloud/pubsub";
import { initializeFirebase } from "../firebaseSetup";

describe("Pub/Sub (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  const region = process.env.REGION;
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (!testId || !projectId || !region || !serviceAccountPath) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("pubsubOnMessagePublishedTests").doc(testId).delete();
  });

  describe("onMessagePublished trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const serviceAccount = await import(serviceAccountPath);
      const topic = new PubSub({
        credentials: serviceAccount.default,
        projectId,
      }).topic("custom_message_tests");

      await topic.publish(Buffer.from(JSON.stringify({ testId })));

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("pubsubOnMessagePublishedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have a topic as source", () => {
      expect(loggedContext?.source).toEqual(
        `//pubsub.googleapis.com/projects/${projectId}/topics/custom_message_tests`
      );
    });

    it("should have the correct event type", () => {
      expect(loggedContext?.type).toEqual("google.cloud.pubsub.topic.v1.messagePublished");
    });

    it("should have an event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have time", () => {
      expect(loggedContext?.time).toBeDefined();
    });

    it("should have pubsub data", () => {
      const decodedMessage = JSON.parse(loggedContext?.message);
      const decoded = new Buffer(decodedMessage.data, "base64").toString();
      const parsed = JSON.parse(decoded);
      expect(parsed.testId).toEqual(testId);
    });
  });
});
