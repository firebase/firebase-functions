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
      functions.logger.error("TestId not found for test matrix completion");
      return;
    }

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
  });
