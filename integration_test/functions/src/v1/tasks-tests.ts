import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const tasksOnDispatchTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .tasks.taskQueue()
  .onDispatch(async (data, context) => {
    const testId = data.testId;
    try {
      await admin
        .firestore()
        .collection("tasksOnDispatchTests")
        .doc(testId)
        .set(sanitizeData(context));
    } catch (error) {
      console.error(`Error in Tasks onDispatch function for testId: ${testId}`, error);
    }
  });
