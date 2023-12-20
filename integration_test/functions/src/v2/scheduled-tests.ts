// import * as admin from "firebase-admin";
// import { onSchedule } from "firebase-functions/v2/scheduler";
// import { REGION } from "../region";

// export const schedulerOnScheduleTests = onSchedule(
//   {
//     schedule: "every 10 hours", // This is a dummy schedule, since we need to put a valid one in.
//     region: REGION,
//   },
//   async (event) => {
//     const testId = event.jobName;
//     if (!testId) {
//       console.error("TestId not found for scheduled function execution");
//       return;
//     }
//     try {
//       await admin
//         .firestore()
//         .collection("schedulerOnScheduleTests")
//         .doc(testId)
//         .set({ success: true });
//     } catch (error) {
//       console.error(`Error in onSchedule function for testId: ${testId}`, error);
//     }
//   }
// );

import * as admin from "firebase-admin";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { REGION } from "../region";
import { success, TestSuite } from "../testing";

export const schedule: any = onSchedule(
  {
    schedule: "every 10 hours",
    region: REGION,
  },
  async () => {
    const db = admin.database();
    const snap = await db.ref("testRuns").orderByChild("timestamp").limitToLast(1).once("value");
    const testId = Object.keys(snap.val())[0];
    return new TestSuite("scheduler scheduleOnRun")
      .it("should trigger when the scheduler fires", () => success())
      .run(testId, null);
  }
);
