import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { REGION } from "../region";
import { sanitizeData } from "../utils";

export const analyticsEventTests: any = functions
  .region(REGION)
  .analytics.event("in_app_purchase")
  .onLog(async (event, context) => {
    const testId = event.params?.testId;
    try {
      await admin
        .firestore()
        .collection("analyticsEventTests")
        .doc(testId)
        .set(
          sanitizeData({
            ...context,
            event: JSON.stringify(event),
          })
        );
    } catch (error) {
      console.error(`Error in Analytics event function for testId: ${testId}`, error);
    }
  });
