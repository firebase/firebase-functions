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
    let taskId: string;

    beforeAll(async () => {
      // Function name becomes the queue name in v1, no separators needed
      const queueName = `tasksOnDispatchTests${testId}`;

      taskId = await createTask(queueName, testId);

      loggedContext = await retry(() =>
        admin
          .firestore()
          .collection("tasksOnDispatchTests")
          .doc(testId)
          .get()
          .then((logSnapshot) => logSnapshot.data())
      );
    });

    it("should have the right eventType", () => {
      expect(loggedContext?.eventType).toEqual("google.cloud.tasks.queue.v2.task.dispatch");
    });

    it("should have eventId", () => {
      expect(loggedContext?.eventId).toBeDefined();
    });

    it("should have timestamp", () => {
      expect(loggedContext?.timestamp).toBeDefined();
    });

    it("should have resource", () => {
      expect(loggedContext?.resource).toBeDefined();
      expect(loggedContext?.resource?.service).toEqual("cloudtasks.googleapis.com");
      expect(loggedContext?.resource?.name).toContain(taskId);
    });
  });
});