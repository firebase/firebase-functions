import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onTestMatrixCompleted } from "firebase-functions/v2/testLab";
import { REGION } from "../region";

export const testLabOnTestMatrixCompletedTests = onTestMatrixCompleted(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.clientInfo?.details?.testId;
    if (!testId) {
      functions.logger.error("TestId not found for test matrix completion");
      return;
    }

    await admin.firestore().collection("testLabOnTestMatrixCompletedTests").doc(testId).set({
      testId,
      type: event.type,
      id: event.id,
      time: event.time,
      state: event.data.state,
    });
  }
);
