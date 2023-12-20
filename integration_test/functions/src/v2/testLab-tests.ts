import * as admin from "firebase-admin";
import { onTestMatrixCompleted } from "firebase-functions/v2/testLab";
import { REGION } from "../region";

export const testLabOnTestMatrixCompletedTests = onTestMatrixCompleted(
  {
    region: REGION,
  },
  async (event) => {
    const testId = event.data.clientInfo?.details?.testId;
    if (!testId) {
      console.error("TestId not found for test matrix completion");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("testLabOnTestMatrixCompletedTests")
        .doc(testId)
        .set({ event: JSON.stringify(event) });
    } catch (error) {
      console.error(
        `Error in Test Matrix onTestMatrixCompleted function for testId: ${testId}`,
        error
      );
    }
  }
);
