import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { REGION } from "../region";

export const tasksOnTaskDispatchedTests = onTaskDispatched(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.testId;

    if (!testId) {
      functions.logger.error("TestId not found for tasks onTaskDispatched");
      return;
    }

    await admin.firestore().collection("tasksOnTaskDispatchedTests").doc(testId).set({
      testId,
      queueName: event.queueName,
      id: event.id,
      scheduledTime: event.scheduledTime,
    });
  }
);
