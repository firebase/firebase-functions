import * as admin from "firebase-admin";
import { onTaskDispatched } from "firebase-functions/v2/tasks";
import { REGION } from "../region";

export const tasksOnTaskDispatchedTests = onTaskDispatched(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.testId;
    try {
      await admin
        .firestore()
        .collection("tasksOnTaskDispatchedTests")
        .doc(testId)
        .set({
          event: JSON.stringify(event),
        });
    } catch (error) {
      console.error(`Error in Tasks onTaskDispatched function for testId: ${testId}`, error);
    }
  }
);
