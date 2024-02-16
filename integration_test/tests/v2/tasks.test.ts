import * as admin from "firebase-admin";
import { initializeFirebase } from "../firebaseSetup";
import { createTask, timeout } from "../utils";

describe("Cloud Tasks (v2)", () => {
  const region = process.env.REGION;
  const testId = process.env.TEST_RUN_ID;
  const projectId = process.env.PROJECT_ID;
  const queueName = `${testId}-v2-tasksOnTaskDispatchedTests`;

  if (!testId || !projectId || !region) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(async () => {
    await initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("tasksOnTaskDispatchedTests").doc(testId).delete();
  });

  describe("onDispatch trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;

    beforeAll(async () => {
      const url = `https://${region}-${projectId}.cloudfunctions.net/${testId}-v2-tasksOnTaskDispatchedTests`;
      await createTask(projectId, queueName, region, url, { data: { testId } });
      await timeout(20000);
      const logSnapshot = await admin
        .firestore()
        .collection("tasksOnTaskDispatchedTests")
        .doc(testId)
        .get();
      loggedContext = logSnapshot.data();
      if (!loggedContext) {
        throw new Error("loggedContext is undefined");
      }
    });

    it("should have correct event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });
  });
});
