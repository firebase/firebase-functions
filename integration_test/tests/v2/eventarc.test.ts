import admin from "firebase-admin";
import { initializeFirebase } from "../firebaseSetup";
import { CloudEvent, getEventarc } from "firebase-admin/eventarc";
import { timeout } from "../utils";

describe("Eventarc (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  const region = process.env.REGION;

  if (!testId || !projectId || !region) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("eventarcOnCustomEventPublishedTests").doc(testId).delete();
  });

  describe("onCustomEventPublished trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const cloudEvent: CloudEvent = {
        type: "achieved-leaderboard",
        source: testId,
        subject: "Welcome to the top 10",
        data: {
          message: "You have achieved the nth position in our leaderboard!  To see...",
          testId,
        },
      };
      await getEventarc().channel(`locations/${region}/channels/firebase`).publish(cloudEvent);

      await timeout(20000);

      const logSnapshot = await admin
        .firestore()
        .collection("eventarcOnCustomEventPublishedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();

      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have well-formed source", () => {
      expect(loggedContext?.source).toMatch(testId);
    });

    it("should have the correct type", () => {
      expect(loggedContext?.type).toEqual("achieved-leaderboard");
    });

    it("should have an id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have a time", () => {
      expect(loggedContext?.time).toBeDefined();
    });

    it("should not have the data", () => {
      const eventData = JSON.parse(loggedContext?.data || "{}");
      expect(eventData.testId).toBeDefined();
    });
  });
});
