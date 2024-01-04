import admin from "firebase-admin";
import firebase from "firebase/app";
import { timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe("Firebase Analytics event onLog trigger", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;
  let loggedContext: admin.firestore.DocumentData | undefined;

  beforeAll(async () => {
    if (!testId || !projectId) {
      throw new Error("Environment configured incorrectly.");
    }

    await initializeFirebase();
    const analytics = firebase.analytics();
    await analytics.logEvent("in_app_purchase", { testId });
    await timeout(20000);
    const logSnapshot = await admin.firestore().collection("analyticsEventTests").doc(testId).get();
    loggedContext = logSnapshot.data();

    if (!loggedContext) {
      throw new Error("loggedContext is undefined");
    }
  });

  it("should not have event.app", () => {
    expect(loggedContext?.app).toBeUndefined();
  });

  it("should not include path", () => {
    expect(loggedContext?.path).toBeUndefined();
  });

  it("should have the right eventType", () => {
    expect(loggedContext?.eventType).toEqual("google.firebase.analytics.event.onlog");
  });

  it("should have eventId", () => {
    expect(loggedContext?.eventId).toBeDefined();
  });

  it("should have timestamp", () => {
    expect(loggedContext?.timestamp).toBeDefined();
  });

  it("should not have action", () => {
    expect(loggedContext?.action).toBeUndefined();
  });
});
