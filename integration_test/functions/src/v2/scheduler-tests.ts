import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { REGION } from "../region";

export const schedulerOnScheduleTests: any = onSchedule(
  {
    schedule: "every 10 hours",
    region: REGION,
  },
  async (event) => {
    const testId = event.jobName;
    if (!testId) {
      console.error("TestId not found for scheduled function execution");
      return;
    }
    try {
      await admin
        .firestore()
        .collection("schedulerOnScheduleTests")
        .doc(testId)
        .set({ success: true });
    } catch (error) {
      console.error(`Error in scheduler onSchedule function for testId: ${testId}`, error);
    }
    return;
  }
);
