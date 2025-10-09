import * as admin from "firebase-admin";
import { retry, createTask } from "../utils";
import { initializeFirebase } from "../firebaseSetup";

describe("Firebase Tasks (v1)", () => {
  const testId = process.env.TEST_RUN_ID;
  if (!testId) {
    throw new Error("Environment configured incorrectly.");
  }

  beforeAll(() => {
    initializeFirebase();
  });

  afterAll(async () => {
    await admin.firestore().collection("tasksOnDispatchTests").doc(testId).delete();
  });

  describe("task queue onDispatch trigger", () => {
    let loggedContext: admin.firestore.DocumentData | undefined;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let taskId: string;

    beforeAll(async () => {
      // Function name becomes the queue name in v1, no separators needed
      const queueName = `tasksOnDispatchTests${testId}`;
      const projectId = process.env.GCLOUD_PROJECT || "functions-integration-tests";
      const region = "us-central1";
      const url = `https://${region}-${projectId}.cloudfunctions.net/${queueName}`;

      // Use Google Cloud Tasks SDK to get proper Cloud Tasks event context
      taskId = await createTask(projectId, queueName, region, url, { data: { testId } });

      loggedContext = await retry(
        () => {
          console.log(`🔍 Checking Firestore for document: tasksOnDispatchTests/${testId}`);
          return admin
            .firestore()
            .collection("tasksOnDispatchTests")
            .doc(testId)
            .get()
            .then((logSnapshot) => {
              const data = logSnapshot.data();
              console.log(`📄 Firestore data:`, data);
              return data;
            });
        },
        { maxRetries: 30, checkForUndefined: true }
      );
    });

    it("should have correct event id", () => {
      expect(loggedContext?.id).toBeDefined();
    });

    it("should have queue name", () => {
      expect(loggedContext?.queueName).toEqual(`tasksOnDispatchTests${testId}`);
    });

    it("should have retry count", () => {
      expect(loggedContext?.retryCount).toBeDefined();
      expect(typeof loggedContext?.retryCount).toBe("number");
    });

    it("should have execution count", () => {
      expect(loggedContext?.executionCount).toBeDefined();
      expect(typeof loggedContext?.executionCount).toBe("number");
    });
  });
});
