import * as admin from "firebase-admin";
import * as functions from "firebase-functions";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { REGION } from "../region";

export const schedule: any = onSchedule(
  {
    schedule: "every 10 hours",
    region: REGION,
  },
  async (event) => {
    const testId = event.jobName;
    if (!testId) {
      functions.logger.error("TestId not found for scheduled function execution");
      return;
    }

    await admin
      .firestore()
      .collection("schedulerOnScheduleV2Tests")
      .doc(testId)
      .set({ success: true });

    return;
  }
);
