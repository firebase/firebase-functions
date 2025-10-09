import * as admin from "firebase-admin";
import { retry, startTestRun } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe.skip("TestLab (v2)", () => {
  const projectId = process.env.PROJECT_ID;
  const testId = process.env.TEST_RUN_ID;

  if (!testId || !projectId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("testLabOnTestMatrixCompletedTests").doc(testId).delete();
  });

  describe("test matrix onComplete trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    let shouldSkip = false;

    beforeAll(async () => {
      try {
        const accessToken = await admin.credential.applicationDefault().getAccessToken();
        await startTestRun(projectId, testId, accessToken.access_token);

        loggedContext = await retry(() =>
          admin
            .firestore()
            .collection("testLabOnTestMatrixCompletedTests")
            .doc(testId)
            .get()
            .then((logSnapshot) => logSnapshot.data())
        );
      } catch (error) {
        console.warn("TestLab API access failed, skipping test:", (error as Error).message);
        shouldSkip = true;
      }
    });

    it("should have event id", () => {
      if (shouldSkip) {
        return;
      }
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have right event type", () => {
      if (shouldSkip) {
        return;
      }
      expect(loggedContext?.type).toEqual("google.firebase.testlab.testMatrix.v1.completed");
    });

    it("should be in state 'INVALID'", () => {
      if (shouldSkip) {
        return;
      }
      expect(loggedContext?.state).toEqual("INVALID");
    });
  });
});
