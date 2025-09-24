import * as admin from "firebase-admin";
import { initializeFirebase } from "../firebaseSetup";
import { CloudEvent, getEventarc } from "firebase-admin/eventarc";
import { retry } from "../utils";

describe("Eventarc (v2)", () => {
  const projectId = process.env.PROJECT_ID || "functions-integration-tests-v2";
  const testId = process.env.TEST_RUN_ID;
  const region = process.env.REGION || "us-central1";

  if (!testId || !projectId || !region) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
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

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("eventarcOnCustomEventPublishedTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
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
