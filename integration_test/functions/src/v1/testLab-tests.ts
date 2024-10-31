import * as admin from "firebase-admin";
import * as functions from "firebase-functions/v1";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const testLabOnCompleteTests = functions
  .runWith({
    timeoutSeconds: 540,
  })
  .region(REGION)
  .testLab.testMatrix()
  .onComplete(async (matrix: unknown, context) => {
    if (!matrix || typeof matrix !== "object" || !("clientInfo" in matrix)) {
      functions.logger.error("Invalid matrix structure for test matrix completion");
      return;
    }
    const clientInfo = (matrix as { clientInfo: unknown }).clientInfo;
    if (!clientInfo || typeof clientInfo !== "object" || !("details" in clientInfo)) {
      functions.logger.error("Invalid clientInfo structure for test matrix completion");
      return;
    }
    const details = clientInfo.details;
    if (!details || typeof details !== "object" || !("testId" in details)) {
      functions.logger.error("Invalid details structure for test matrix completion");
      return;
    }
    const testId = details.testId as string;

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
