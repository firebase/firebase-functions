import { PubSub } from "@google-cloud/pubsub";
import * as admin from "firebase-admin";
import { initializeFirebase } from "../firebaseSetup";
import { retry } from "../utils";

describe("Pub/Sub (v1)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  const region = process.env.REGION || "us-central1";
  const serviceAccountPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const topicName = `firebase-schedule-pubsubScheduleTests${testId}-${region}`;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  if (!serviceAccountPath) {
    console.warn("GOOGLE_APPLICATION_CREDENTIALS not set, skipping Pub/Sub tests");
    describe.skip("Pub/Sub (v1)", () => {
      it("skipped due to missing credentials", () => {
        expect(true).toBe(true); // Placeholder assertion
      });
    });
    return;
  }

  beforeAll(() => {
    initializeFirebase();
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

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("pubsubOnPublishTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    it("should have a topic as resource", () => {
      expect(loggedContext?.resource.name).toEqual(
        `projects/${projectId}/topics/pubsubTests`
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
      const decoded = Buffer.from(decodedMessage.data, "base64").toString();
      const parsed = JSON.parse(decoded);
      expect(parsed.testId).toEqual(testId);
    });
  });

  describe("schedule trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const pubsub = new PubSub();

      // Publish a message to trigger the scheduled function
      // The Cloud Scheduler will create a topic with the function name
      const scheduleTopic = pubsub.topic(topicName);

      await scheduleTopic.publish(Buffer.from(JSON.stringify({ testId })));

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("pubsubScheduleTests")
          .doc(topicName)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    it("should have correct resource name", () => {
      expect(loggedContext?.resource.name).toContain("topics/");
      expect(loggedContext?.resource.name).toContain("pubsubScheduleTests");
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

    it("should not have auth", () => {
      expect(loggedContext?.auth).toBeUndefined();
    });
  });
});