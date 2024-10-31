import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const tasksOnDispatchTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .tasks.taskQueue()
  .onDispatch(async (data: unknown, context) => {
    if (!data || typeof data !== "object" || !("testId" in data)) {
      functions.logger.error("Invalid data structure for tasks onDispatch");
      return;
    }
    const testId = (data as { testId: string }).testId;

    await admin
      .firestore()
      .collection("tasksOnDispatchTests")
      .doc(testId)
      .set(sanitizeData(context));
  });
