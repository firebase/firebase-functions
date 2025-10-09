import * as admin from "firebase-admin";
import { retry, startTestRun } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe.skip("TestLab (v1)", () => {
  const projectId = process.env.PROJECT_ID || "functions-integration-tests";
  const testId = process.env.TEST_RUN_ID || "skipped-test";

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("testLabOnCompleteTests").doc(testId).delete();
  });

  describe("test matrix onComplete trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      try {
        const accessToken = await admin.credential.applicationDefault().getAccessToken();
        await startTestRun(projectId, testId, accessToken.access_token);

        loggedContext = await retry(() =>
          admin
            .firestore()
            .collection("testLabOnCompleteTests")
            .doc(testId)
            .get()
            .then((logSnapshot) => logSnapshot.data())
        );
      } catch (error) {
        console.warn("TestLab API access failed, skipping test:", (error as Error).message);
        // Skip the test suite if TestLab API is not available
        return;
      }
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.testing.testMatrix.complete");
    });

    it("should be in state 'INVALID'", () => {
      const matrix = JSON.parse(loggedContext?.matrix);
      expect(matrix?.state).toEqual("INVALID");
    });
  });
});
