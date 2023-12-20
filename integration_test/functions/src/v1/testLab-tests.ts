import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const testLabOnCompleteTests: any = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .testLab.testMatrix()
  .onComplete(async (matrix, context) => {
    const testId = matrix?.clientInfo?.details?.testId;
    if (!testId) {
      console.error("TestId not found for test matrix completion");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("testLabOnCompleteTests")
        .doc(testId)
        .set(
          sanitizeData({
            ...context,
            matrix: JSON.stringify(matrix),
          })
        );
    } catch (error) {
      console.error(`Error in Test Matrix onComplete function for testId: ${testId}`, error);
    }
  });
