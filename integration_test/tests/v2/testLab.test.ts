import admin from "firebase-admin";
import { startTestRun, timeout } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe("TestLab (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("testLabOnTestMatrixCompletedTests").doc(testId).delete();
  });

  describe("test matrix onComplete trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const accessToken = await admin.credential.applicationDefault().getAccessToken();
      await startTestRun(projectId, testId, accessToken.access_token);
      await timeout(20000);
      const logSnapshot = await admin
        .firestore()
        .collection("testLabOnTestMatrixCompletedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have right event type", () => {
      expect(loggedContext?.type).toEqual("google.firebase.testlab.testMatrix.v1.completed");
    });

    it("should be in state 'INVALID'", () => {
      expect(loggedContext?.state).toEqual("INVALID");
    });
  });
});
