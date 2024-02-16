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
    if (!testId) {
      functions.logger.error("TestId not found for tasks onDispatch");
      return;
    }

    await admin
      .firestore()
      .collection("tasksOnDispatchTests")
      .doc(testId)
      .set(sanitizeData(context));
  });
